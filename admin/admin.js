
        // 加载系统名称
        async function loadAdminSystemName() {
            console.log('开始加载系统名称');
            try {
                await window.loadSystemName({
                    updateTitle: false,
                    elements: [
                        {
                            selector: '#systemNameDisplay',
                            type: 'text'
                        }
                    ]
                });
            } catch (error) {
                console.error('加载系统名称失败:', error);
                // 加载失败时使用默认值
                const systemNameDisplay = document.getElementById('systemNameDisplay');
                console.log('系统名称显示元素:', systemNameDisplay);
                if (systemNameDisplay) {
                    systemNameDisplay.textContent = '考勤管理系统';
                    console.log('系统名称已更新为默认值: 考勤管理系统');
                }
            }
        }
        
        // 页面加载完成后执行
        document.addEventListener('DOMContentLoaded', async function() {
            // 检查登录状态
            checkLoginStatus();
            
            // 加载系统名称
            await loadAdminSystemName();
            
            // 加载默认页面
            loadPage('dashboard');
            
            // 绑定导航点击事件
            document.querySelectorAll('.nav-item').forEach(item => {
                item.addEventListener('click', function(e) {
                    e.preventDefault();
                    const page = this.getAttribute('data-page');
                    loadPage(page);
                    
                    // 更新活动状态
                    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                    this.classList.add('active');
                    
                    // 在移动设备上，点击导航后关闭侧边栏
                    if (window.innerWidth <= 768) {
                        document.querySelector('.sidebar').classList.remove('show');
                    }
                });
            });
            
            // 退出登录按钮点击事件
            document.getElementById('logoutBtn').addEventListener('click', function() {
                // 清除本地存储
                localStorage.removeItem('admin_username');
                localStorage.removeItem('admin_password');
                
                // 跳转到管理员登录页面
                window.location.href = '/jg/admin/index.html';
            });
            
            // 刷新按钮点击事件
            document.getElementById('refreshBtn').addEventListener('click', function() {
                const currentPage = document.querySelector('.nav-item.active').getAttribute('data-page');
                loadPage(currentPage);
            });
            
            // 新建按钮点击事件
            document.getElementById('addBtn').addEventListener('click', function() {
                const currentPage = document.querySelector('.nav-item.active').getAttribute('data-page');
                showAddDialog(currentPage);
            });
            
            // 控制新建按钮的显示/隐藏
            function updateAddButtonVisibility() {
                const currentPage = document.querySelector('.nav-item.active').getAttribute('data-page');
                const addBtn = document.getElementById('addBtn');
                
                // 定义有新建功能的页面
                const pagesWithAddFunction = ['users', 'projects', 'attendance', 'holidays', 'expenses'];
                
                if (pagesWithAddFunction.includes(currentPage)) {
                    addBtn.style.display = 'flex';
                } else {
                    addBtn.style.display = 'none';
                }
            }
            
            // 初始更新新建按钮可见性
            updateAddButtonVisibility();
            
            // 导航点击时更新新建按钮可见性
            document.querySelectorAll('.nav-item').forEach(item => {
                item.addEventListener('click', function() {
                    updateAddButtonVisibility();
                });
            });
            
            // 移动菜单按钮点击事件
            document.getElementById('mobileMenuBtn').addEventListener('click', function(e) {
                e.stopPropagation(); // 阻止事件冒泡
                const sidebar = document.querySelector('.sidebar');
                sidebar.classList.toggle('show');
            });
            
            // 点击侧边栏外部关闭侧边栏（仅在移动设备上）
            document.addEventListener('click', function(e) {
                const sidebar = document.querySelector('.sidebar');
                const mobileMenuBtn = document.getElementById('mobileMenuBtn');
                
                if (window.innerWidth <= 768 && 
                    sidebar.classList.contains('show') && 
                    !sidebar.contains(e.target) && 
                    e.target !== mobileMenuBtn) {
                    sidebar.classList.remove('show');
                }
            });
            
            // 点击侧边栏内部阻止事件冒泡
            document.querySelector('.sidebar').addEventListener('click', function(e) {
                e.stopPropagation();
            });
        });
        
        // 检查登录状态
        function checkLoginStatus() {
            const username = localStorage.getItem('admin_username');
            if (!username) {
                // 未登录，跳转到登录页面
                window.location.href = '/jg/admin/index.html';
            }
        }
        
        // 分页功能
        function changePage(page) {
            loadDashboard(page);
        }
        
        // 加载页面内容
        function loadPage(page) {
            const content = document.getElementById('pageContent');
            const pageTitle = document.getElementById('pageTitle');
            
            // 设置页面标题
            const pageTitles = {
                dashboard: '仪表盘',
                users: '用户管理',
                projects: '项目管理',
                attendance: '考勤管理',
                holidays: '节假日管理',
                statistics: '数据统计',
                settings: '系统设置',
                database: '数据库管理',
                feedback: '反馈管理'
            };
            
            pageTitle.textContent = pageTitles[page] || '仪表盘';
            
            // 显示加载状态
            content.innerHTML = `
                <div class="loading">
                    <div class="loading-spinner"></div>
                </div>
            `;
            
            // 根据页面类型加载内容
            switch (page) {
                case 'dashboard':
                    loadDashboard();
                    break;
                case 'users':
                    loadUsers();
                    break;
                case 'projects':
                    loadProjects();
                    break;
                case 'attendance':
                    loadAttendance();
                    break;
                case 'holidays':
                    loadHolidays();
                    break;
                case 'statistics':
                    loadStatistics();
                    break;
                case 'settings':
                    loadSettings();
                    break;
                case 'database':
                    loadDatabase();
                    break;
                case 'feedback':
                    loadFeedback();
                    break;
                default:
                    loadDashboard();
            }
        }
        
        // 加载仪表盘
        async function loadDashboard(page = 1) {
            const content = document.getElementById('pageContent');
            
            try {
                // 获取统计数据
                const [usersCount, projectsCount, attendanceCount, holidaysCount, expensesCount] = await Promise.all([
                    fetch('/jg/api/get-users.php').then(r => r.json()),
                    fetch('/jg/api/get-projects.php?admin=1').then(r => r.json()).catch(() => ({ success: true, projects: [] })),
                    fetch('/jg/api/get-attendance.php').then(r => r.json()).catch(() => ({ success: true, attendance: [] })),
                    fetch('/jg/api/get-holidays.php').then(r => r.json()).catch(() => ({ success: true, holidays: [] })),
                    fetch('/jg/api/get-expenses.php').then(r => r.json()).catch(() => ({ success: true, expenses: [] }))
                ]);
                
                const totalUsers = usersCount.success ? usersCount.users.length : 0;
                const totalProjects = projectsCount.success ? projectsCount.projects.length : 0;
                const totalAttendance = attendanceCount.success ? attendanceCount.attendance.length : 0;
                const totalHolidays = holidaysCount.success ? holidaysCount.holidays.length : 0;
                
                // 计算总报销金额
                let totalExpenses = 0;
                if (expensesCount.success && expensesCount.expenses) {
                    totalExpenses = expensesCount.expenses.reduce((sum, expense) => {
                        return sum + parseFloat(expense.amount || 0);
                    }, 0);
                }
                
                // 构建最近活动数据
                let recentActivities = [];
                
                // 创建用户ID到姓名的映射
                const userIdToName = {};
                if (usersCount.success && usersCount.users.length > 0) {
                    usersCount.users.forEach(user => {
                        userIdToName[user.id] = user.name || user.phone;
                    });
                }
                
                // 添加用户注册记录
                if (usersCount.success && usersCount.users.length > 0) {
                    usersCount.users.forEach(user => {
                        recentActivities.push({
                            type: 'user',
                            action: '注册',
                            details: `用户 ${user.phone} 注册`,
                            time: user.created_at
                        });
                    });
                }
                
                // 添加项目创建记录
                if (projectsCount.success && projectsCount.projects.length > 0) {
                    projectsCount.projects.forEach(project => {
                        // 获取创建者信息
                        let creator = '系统';
                        if (project.user_id && userIdToName[project.user_id]) {
                            creator = userIdToName[project.user_id];
                        }
                        
                        recentActivities.push({
                            type: 'project',
                            action: '创建',
                            details: `项目 ${project.name} 由 ${creator} 创建`,
                            time: project.createdAt || project.created_at
                        });
                    });
                }
                
                // 添加考勤记录
                if (attendanceCount.success && attendanceCount.attendance.length > 0) {
                    attendanceCount.attendance.forEach(record => {
                        const userName = userIdToName[record.user_id] || record.user_id;
                        recentActivities.push({
                            type: 'attendance',
                            action: '打卡',
                            details: `用户 ${userName} 考勤记录`,
                            time: record.created_at
                        });
                    });
                }
                
                // 添加报销记录
                if (expensesCount.success && expensesCount.expenses.length > 0) {
                    expensesCount.expenses.forEach(expense => {
                        const userName = userIdToName[expense.user_id] || expense.user_id;
                        recentActivities.push({
                            type: 'expense',
                            action: '报销',
                            details: `用户 ${userName} 提交报销 ${expense.amount}元`,
                            time: expense.created_at || expense.date
                        });
                    });
                }
                
                // 按时间排序
                recentActivities.sort((a, b) => new Date(b.time) - new Date(a.time));
                
                // 只保留最近三个月的记录
                const threeMonthsAgo = new Date();
                threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                recentActivities = recentActivities.filter(activity => {
                    return new Date(activity.time) >= threeMonthsAgo;
                });
                
                // 分页设置
                const pageSize = 20;
                let currentPage = page;
                const totalPages = Math.ceil(recentActivities.length / pageSize);
                
                // 计算当前页的记录
                const startIndex = (currentPage - 1) * pageSize;
                const endIndex = startIndex + pageSize;
                const currentActivities = recentActivities.slice(startIndex, endIndex);
                
                // 生成最近活动HTML
                let activitiesHtml = '';
                if (recentActivities.length > 0) {
                    activitiesHtml = `
                        <ul style="list-style: none; padding: 0;">
                            ${currentActivities.map(activity => `
                                <li style="padding: 12px 0; border-bottom: 1px solid rgba(6, 182, 212, 0.2); display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <span style="font-weight: 500;">${activity.details}</span>
                                        <p style="font-size: 12px; color: #7f8c8d; margin: 4px 0 0 0;">${activity.time}</p>
                                    </div>
                                    <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; background-color: ${activity.type === 'user' ? '#3498db' : activity.type === 'project' ? '#2ecc71' : activity.type === 'attendance' ? '#f1c40f' : '#e74c3c'}; color: white;">${activity.action}</span>
                                </li>
                            `).join('')}
                        </ul>
                        ${totalPages > 1 ? `
                            <div style="display: flex; justify-content: center; margin-top: 20px; gap: 10px;">
                                <button ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})" class="btn btn-secondary" style="padding: 6px 12px; font-size: 14px;">
                                    <i class="fas fa-chevron-left"></i> 上一页
                                </button>
                                <span style="display: flex; align-items: center; font-size: 14px;">
                                    第 ${currentPage} / ${totalPages} 页
                                </span>
                                <button ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})" class="btn btn-secondary" style="padding: 6px 12px; font-size: 14px;">
                                    下一页 <i class="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        ` : ''}
                    `;
                } else {
                    activitiesHtml = `<div style="text-align: center; padding: 40px; color: #7f8c8d;">暂无活动记录</div>`;
                }
                
                content.innerHTML = `
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-icon users">
                                <i class="fas fa-users"></i>
                            </div>
                            <div class="stat-info">
                                <h3>${totalUsers}</h3>
                                <p>总用户数</p>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon projects">
                                <i class="fas fa-project-diagram"></i>
                            </div>
                            <div class="stat-info">
                                <h3>${totalProjects}</h3>
                                <p>项目数量</p>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon attendance">
                                <i class="fas fa-clipboard-list"></i>
                            </div>
                            <div class="stat-info">
                                <h3>${totalAttendance}</h3>
                                <p>考勤记录</p>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon holidays">
                                <i class="fas fa-calendar-alt"></i>
                            </div>
                            <div class="stat-info">
                                <h3>${totalHolidays}</h3>
                                <p>节假日</p>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon expenses">
                                <i class="fas fa-receipt"></i>
                            </div>
                            <div class="stat-info">
                                <h3>¥${totalExpenses.toFixed(2)}</h3>
                                <p>报销金额</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">最近活动</h3>
                        </div>
                        <div style="padding: 0 20px;">
                            ${activitiesHtml}
                        </div>
                    </div>
                `;
            } catch (error) {
                console.error('加载仪表盘失败:', error);
                content.innerHTML = '<div class="message error">加载数据失败，请稍后重试</div>';
            }
        }
        
        // 加载用户管理
        async function loadUsers() {
            const content = document.getElementById('pageContent');
            
            try {
                const response = await fetch('/jg/api/get-users.php');
                const data = await response.json();
                
                if (data.success) {
                    // 检测屏幕尺寸
                    const isMobile = window.innerWidth <= 768;
                    
                    if (isMobile) {
                        // 移动端使用卡片布局
                        content.innerHTML = `
                            <div class="card">
                                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                                <h3 class="card-title">用户列表</h3>
                                <div style="display: flex; gap: 10px; align-items: center; flex: 1;">
                                    <input type="text" id="userSearch" placeholder="搜索姓名或手机号" style="padding: 10px; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 8px; color: #e2e8f0; flex: 1; min-width: 150px;">
                                    <button class="btn btn-secondary" onclick="searchUsers()">
                                        <i class="fas fa-search"></i> 搜索
                                    </button>
                                </div>
                            </div>
                                <div class="user-cards" id="usersTable">
                                    ${data.users.length > 0 ? data.users.map(user => `
                                        <div class="user-card">
                                            <div class="user-card-header">
                                                <div class="user-card-title">${user.name || user.phone}</div>
                                                <div class="user-card-id">ID: ${user.id}</div>
                                            </div>
                                            <div class="user-card-info">
                                                <div class="user-card-info-item">
                                                    <div class="user-card-info-label">手机号:</div>
                                                    <div class="user-card-info-value">${user.phone}</div>
                                                </div>
                                                <div class="user-card-info-item">
                                                    <div class="user-card-info-label">角色:</div>
                                                    <div class="user-card-info-value">${user.role === 'foreman' ? '工头' : '普通工人'}</div>
                                                </div>
                                                <div class="user-card-info-item">
                                                    <div class="user-card-info-label">注册时间:</div>
                                                    <div class="user-card-info-value">${user.created_at}</div>
                                                </div>
                                            </div>
                                            <div class="user-card-actions">
                                                <button class="btn btn-secondary" onclick="viewUser('${user.id}')">查看</button>
                                                <button class="btn btn-primary" onclick="editUser('${user.id}')">编辑</button>
                                                <button class="btn btn-secondary" onclick="resetUserPassword('${user.id}')">重置</button>
                                                <button class="btn btn-danger" onclick="deleteUser('${user.id}')">删除</button>
                                            </div>
                                        </div>
                                    `).join('') : `
                                        <div style="text-align: center; padding: 40px; color: #7f8c8d;">暂无用户数据</div>
                                    `}
                                </div>
                            </div>
                        `;
                    } else {
                        // 桌面端使用表格布局
                        content.innerHTML = `
                            <div class="card">
                                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                                <h3 class="card-title">用户列表</h3>
                                <div style="display: flex; gap: 10px; align-items: center;">
                                    <input type="text" id="userSearch" placeholder="搜索姓名或手机号" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 200px; min-width: 150px;">
                                    <button class="btn btn-secondary" onclick="searchUsers()">
                                        <i class="fas fa-search"></i> 搜索
                                    </button>
                                </div>
                            </div>
                                <table class="table" id="usersTable">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>姓名</th>
                                            <th>手机号</th>
                                            <th>角色</th>
                                            <th>注册时间</th>
                                            <th>操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${data.users.length > 0 ? data.users.map(user => `
                                            <tr>
                                                <td>${user.id}</td>
                                                <td>${user.name || '-'}</td>
                                                <td>${user.phone}</td>
                                                <td>${user.role === 'foreman' ? '工头' : '普通工人'}</td>
                                                <td>${user.created_at}</td>
                                                <td style="display: flex; gap: 2px; flex-wrap: wrap;">
                                        <button class="btn btn-secondary" onclick="viewUser('${user.id}')" style="padding: 2px 6px; font-size: 12px;">查看</button>
                                        <button class="btn btn-primary" onclick="editUser('${user.id}')" style="padding: 2px 6px; font-size: 12px;">编辑</button>
                                        <button class="btn btn-secondary" onclick="resetUserPassword('${user.id}')" style="padding: 2px 6px; font-size: 12px;">重置</button>
                                        <button class="btn btn-danger" onclick="deleteUser('${user.id}')" style="padding: 2px 6px; font-size: 12px;">删除</button>
                                    </td>
                                            </tr>
                                        `).join('') : `
                                            <tr>
                                                <td colspan="5" style="text-align: center; padding: 40px;">暂无用户数据</td>
                                            </tr>
                                        `}
                                    </tbody>
                                </table>
                            </div>
                        `;
                    }
                    
                    // 绑定搜索功能
                    document.getElementById('userSearch').addEventListener('input', function() {
                        searchUsers();
                    });
                } else {
                    content.innerHTML = '<div class="message error">' + data.error + '</div>';
                }
            } catch (error) {
                console.error('加载用户列表失败:', error);
                content.innerHTML = '<div class="message error">加载用户列表失败，请稍后重试</div>';
            }
        }
        
        // 加载项目管理
        async function loadProjects() {
            const content = document.getElementById('pageContent');
            
            try {
                const response = await fetch('/jg/api/get-projects.php?admin=1');
                const data = await response.json();
                
                if (data.success) {
                    // 检测屏幕尺寸
                    const isMobile = window.innerWidth <= 768;
                    
                    if (isMobile) {
                        // 移动端使用卡片布局
                        content.innerHTML = `
                            <div class="card">
                                <div class="card-header">
                                    <h3 class="card-title">项目列表</h3>
                                </div>
                                <div class="project-cards">
                                    ${data.projects.length > 0 ? data.projects.map(project => `
                                        <div class="project-card">
                                            <div class="project-card-header">
                                                <div class="project-card-title">${project.name}</div>
                                                <div class="project-card-id">ID: ${project.id}</div>
                                            </div>
                                            <div class="project-card-status ${project.isEnded ? 'ended' : 'active'}">
                                                ${project.isEnded ? '已结束' : '进行中'}
                                            </div>
                                            <div class="project-card-info">
                                                <div class="project-card-info-item">
                                                    <div class="project-card-info-label">地址:</div>
                                                    <div class="project-card-info-value">${project.address || '-'}</div>
                                                </div>
                                                <div class="project-card-info-item">
                                                    <div class="project-card-info-label">项目经理:</div>
                                                    <div class="project-card-info-value">${project.personalInfo?.manager || project.manager || project.personalInfo?.name || '-'}</div>
                                                </div>
                                                <div class="project-card-info-item">
                                                    <div class="project-card-info-label">联系电话:</div>
                                                    <div class="project-card-info-value">${project.personalInfo?.phone || project.phone || '-'}</div>
                                                </div>
                                            </div>
                                            <div class="project-card-actions">
                                                <button class="btn btn-secondary" onclick="viewProject('${project.id}')">查看</button>
                                                <button class="btn btn-primary" onclick="assignEmployeesToProject('${project.id}')">分配员工</button>
                                                <button class="btn btn-danger" onclick="deleteProject('${project.id}')">删除</button>
                                            </div>
                                        </div>
                                    `).join('') : `
                                        <div style="text-align: center; padding: 40px; color: #7f8c8d;">暂无项目数据</div>
                                    `}
                                </div>
                            </div>
                        `;
                    } else {
                        // 桌面端使用表格布局
                        content.innerHTML = `
                            <div class="card">
                                <div class="card-header">
                                    <h3 class="card-title">项目列表</h3>
                                </div>
                                <div style="overflow-x: auto;">
                                    <table class="table">
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>项目名称</th>
                                                <th>地址</th>
                                                <th>项目经理</th>
                                                <th>联系电话</th>
                                                <th>状态</th>
                                                <th>操作</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${data.projects.length > 0 ? data.projects.map(project => `
                                                <tr>
                                                    <td>${project.id}</td>
                                                <td>${project.name}</td>
                                                <td>${project.address || '-'}</td>
                                                <td>${project.personalInfo?.manager || project.manager || project.personalInfo?.name || '-'}</td>
                                                <td>${project.personalInfo?.phone || project.phone || '-'}</td>
                                                <td>${project.isEnded ? '已结束' : '进行中'}</td>
                                                    <td style="display: flex; gap: 8px; flex-wrap: wrap;">
                                                <button class="btn btn-secondary" onclick="viewProject('${project.id}')" style="padding: 4px 8px; font-size: 12px;">查看</button>
                                                <button class="btn btn-primary" onclick="assignEmployeesToProject('${project.id}')" style="padding: 4px 8px; font-size: 12px;">分配员工</button>
                                                <button class="btn btn-danger" onclick="deleteProject('${project.id}')" style="padding: 4px 8px; font-size: 12px;">删除</button>
                                            </td>
                                                </tr>
                                            `).join('') : `
                                                <tr>
                                                    <td colspan="7" style="text-align: center; padding: 40px;">暂无项目数据</td>
                                                </tr>
                                            `}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        `;
                    }
                } else {
                    content.innerHTML = '<div class="message error">' + data.error + '</div>';
                }
            } catch (error) {
                console.error('加载项目列表失败:', error);
                content.innerHTML = '<div class="message error">加载项目列表失败，请稍后重试</div>';
            }
        }
        
        // 加载考勤管理
        async function loadAttendance() {
            // 默认加载当前月份的考勤记录
            loadAttendanceWithMonth();
        }
        
        // 加载指定月份的考勤记录
        async function loadAttendanceWithMonth(month) {
            const content = document.getElementById('pageContent');
            
            try {
                // 构建API请求URL，添加月份参数
                const attendanceUrl = month ? `/jg/api/get-attendance.php?month=${month}` : '/jg/api/get-attendance.php';
                
                // 并行获取考勤记录、用户列表和项目列表
                const [attendanceResponse, usersResponse, projectsResponse] = await Promise.all([
                    fetch(attendanceUrl),
                    fetch('/jg/api/get-users.php'),
                    fetch('/jg/api/get-projects.php?admin=1')
                ]);
                
                const attendanceData = await attendanceResponse.json();
                const usersData = await usersResponse.json();
                const projectsData = await projectsResponse.json();
                
                if (attendanceData.success) {
                    // 创建用户ID到姓名的映射
                    const userIdToName = {};
                    if (usersData.success) {
                        usersData.users.forEach(user => {
                            userIdToName[user.id] = user.name || user.phone;
                        });
                    }
                    
                    // 创建项目ID到名称的映射
                    const projectIdToName = {};
                    if (projectsData.success) {
                        projectsData.projects.forEach(project => {
                            projectIdToName[project.id] = project.name;
                        });
                    }
                    
                    // 检测屏幕尺寸
                    const isMobile = window.innerWidth <= 768;
                    
                    if (isMobile) {
                        // 移动端使用卡片布局
                        content.innerHTML = `
                            <div class="card">
                                <div class="card-header">
                                    <h3 class="card-title">考勤记录</h3>
                                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                                        <div style="display: flex; align-items: center; gap: 5px;">
                                            <label for="monthSelect" style="font-size: 14px;">选择月份:</label>
                                            <input type="month" id="monthSelect" value="${attendanceData.currentMonth || new Date().toISOString().slice(0, 7)}" style="padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
                                        </div>
                                    </div>
                                </div>
                                <div class="attendance-cards">
                                    ${attendanceData.attendance.length > 0 ? attendanceData.attendance.map(record => `
                                        <div class="attendance-card">
                                            <div class="attendance-card-header">
                                                <div class="attendance-card-title">${userIdToName[record.user_id] || record.user_id}</div>
                                            </div>
                                            <div class="attendance-card-status ${record.status}">
                                                ${record.status === 'present' ? '出勤' : record.status === 'half' ? '半天' : '缺勤'}
                                            </div>
                                            <div class="attendance-card-info">
                                                <div class="attendance-card-info-item">
                                                    <div class="attendance-card-info-label">项目:</div>
                                                    <div class="attendance-card-info-value">${projectIdToName[record.projectId] || record.projectId}</div>
                                                </div>
                                                <div class="attendance-card-info-item">
                                                    <div class="attendance-card-info-label">日期:</div>
                                                    <div class="attendance-card-info-value">${record.date}</div>
                                                </div>
                                            </div>
                                            <div class="attendance-card-actions">
                                                <button class="btn btn-secondary" onclick="viewAttendance('${record.id}')">查看</button>
                                                <button class="btn btn-danger" onclick="deleteAttendance('${record.id}')">删除</button>
                                            </div>
                                        </div>
                                    `).join('') : `
                                        <div style="text-align: center; padding: 40px; color: #7f8c8d;">暂无考勤记录</div>
                                    `}
                                </div>
                            </div>
                        `;
                    } else {
                        // 桌面端使用表格布局
                        content.innerHTML = `
                            <div class="card">
                                <div class="card-header">
                                    <h3 class="card-title">考勤记录</h3>
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <div style="display: flex; align-items: center; gap: 5px;">
                                            <label for="monthSelect" style="font-size: 14px;">选择月份:</label>
                                            <input type="month" id="monthSelect" value="${attendanceData.currentMonth || new Date().toISOString().slice(0, 7)}" style="padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
                                        </div>
                                    </div>
                                </div>
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>用户</th>
                                            <th>项目</th>
                                            <th>日期</th>
                                            <th>状态</th>
                                            <th>操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${attendanceData.attendance.length > 0 ? attendanceData.attendance.map(record => `
                                            <tr>
                                            <td>${userIdToName[record.user_id] || record.user_id}</td>
                                            <td>${projectIdToName[record.projectId] || record.projectId}</td>
                                            <td>${record.date}</td>
                                            <td>${record.status === 'present' ? '出勤' : record.status === 'half' ? '半天' : '缺勤'}</td>
                                            <td style="display: flex; gap: 8px;">
                                        <button class="btn btn-secondary" onclick="viewAttendance('${record.id}')" style="flex: 1; min-width: 80px;">查看</button>
                                        <button class="btn btn-danger" onclick="deleteAttendance('${record.id}')" style="flex: 1; min-width: 80px;">删除</button>
                                    </td>
                                            </tr>
                                        `).join('') : `
                                            <tr>
                                                <td colspan="5" style="text-align: center; padding: 40px;">暂无考勤记录</td>
                                            </tr>
                                        `}
                                    </tbody>
                                </table>
                            </div>
                        `;
                    }
                    

                    
                    // 绑定月份选择事件
                    const monthSelect = document.getElementById('monthSelect');
                    if (monthSelect) {
                        monthSelect.addEventListener('change', function() {
                            const selectedMonth = this.value;
                            // 重新加载考勤记录，传递月份参数
                            loadAttendanceWithMonth(selectedMonth);
                        });
                    }
                } else {
                    content.innerHTML = '<div class="message error">' + attendanceData.error + '</div>';
                }
            } catch (error) {
                console.error('加载考勤记录失败:', error);
                content.innerHTML = '<div class="message error">加载考勤记录失败，请稍后重试</div>';
            }
        }
        
        // 加载节假日管理
        async function loadHolidays() {
            const content = document.getElementById('pageContent');
            
            try {
                // 管理员查看所有节日，传递admin参数
                const url = new URL('/jg/api/get-holidays.php', window.location.origin);
                url.searchParams.set('admin', '1');
                const response = await fetch(url.toString());
                const data = await response.json();
                
                if (data.success) {
                    let currentCategory = 'all';
                    
                    function renderHolidays(category) {
                        currentCategory = category;
                        let filteredHolidays = data.holidays;
                        if (category !== 'all') {
                            filteredHolidays = data.holidays.filter(h => h.category === category);
                        }
                        
                        document.querySelectorAll('.tab-btn').forEach(btn => {
                            const btnCategory = btn.dataset.category;
                            if (btnCategory === category) {
                                btn.style.color = 'var(--primary-color)';
                                btn.style.borderBottomColor = 'var(--primary-color)';
                                btn.style.fontWeight = '500';
                            } else {
                                btn.style.color = 'var(--text-secondary)';
                                btn.style.borderBottomColor = 'transparent';
                                btn.style.fontWeight = 'normal';
                            }
                        });
                        
                        const isMobile = window.innerWidth <= 768;
                        
                        if (isMobile) {
                            // 移动端使用卡片布局
                            document.getElementById('holidayContent').innerHTML = `
                                <div class="holiday-cards">
                                    ${filteredHolidays.length > 0 ? filteredHolidays.map(holiday => `
                                        <div class="holiday-card">
                                            <div class="holiday-card-header">
                                                <div class="holiday-card-title">${holiday.name}</div>
                                                <div class="holiday-card-date">${holiday.date}</div>
                                            </div>
                                            ${holiday.category ? `<div style="font-size: 12px; color: var(--info-color); margin-bottom: 8px;">分类: ${getCategoryLabel(holiday.category)}</div>` : ''}
                                            <div class="holiday-card-actions">
                                                <button class="btn btn-secondary" onclick="editHoliday('${holiday.id}')">编辑</button>
                                                <button class="btn btn-danger" onclick="deleteHoliday('${holiday.id}')">删除</button>
                                            </div>
                                        </div>
                                    `).join('') : `
                                        <div style="text-align: center; padding: 40px; color: #7f8c8d;">暂无节假日数据</div>
                                    `}
                                </div>
                            `;
                        } else {
                            // 桌面端使用表格布局
                            document.getElementById('holidayContent').innerHTML = `
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th><input type="checkbox" id="selectAllHolidays" style="margin: 0;"></th>
                                            <th>日期</th>
                                            <th>名称</th>
                                            <th>分类</th>
                                            <th>操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${filteredHolidays.length > 0 ? filteredHolidays.map(holiday => `
                                            <tr>
                                                <td><input type="checkbox" class="holiday-checkbox" data-id="${holiday.id}" style="margin: 0;"></td>
                                                <td>${holiday.date}</td>
                                                <td>${holiday.name}</td>
                                                <td>${getCategoryLabel(holiday.category)}</td>
                                                <td style="display: flex; gap: 8px;">
                                        <button class="btn btn-secondary" onclick="editHoliday('${holiday.id}')" style="flex: 1; min-width: 80px;">编辑</button>
                                        <button class="btn btn-danger" onclick="deleteHoliday('${holiday.id}')" style="flex: 1; min-width: 80px;">删除</button>
                                    </td>
                                            </tr>
                                        `).join('') : `
                                            <tr>
                                                <td colspan="5" style="text-align: center; padding: 40px;">暂无节假日数据</td>
                                            </tr>
                                        `}
                                    </tbody>
                                </table>
                            `;
                        }
                    }
                    
                    function getCategoryLabel(category) {
                        const labels = {
                            'statutory': '法定节日',
                            'traditional': '中国传统'
                        };
                        return labels[category] || '法定节日';
                    }
                    
                    content.innerHTML = `
                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title">节假日列表</h3>
                                <div class="card-actions">
                                    <button id="batchCategoryBtn" class="btn btn-sm btn-primary" style="margin-left: 10px;">
                                        <i class="fas fa-tags"></i> 批量分类
                                    </button>
                                </div>
                            </div>
                            <div class="tabs" style="margin-bottom: 20px; border-bottom: 2px solid var(--border-color);">
                                <button class="tab-btn" data-category="all" style="padding: 10px 20px; background: none; border: none; cursor: pointer; font-size: 14px; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s;">全部</button>
                                <button class="tab-btn" data-category="statutory" style="padding: 10px 20px; background: none; border: none; cursor: pointer; font-size: 14px; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s;">法定节日</button>
                                <button class="tab-btn" data-category="traditional" style="padding: 10px 20px; background: none; border: none; cursor: pointer; font-size: 14px; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s;">中国传统</button>
                            </div>
                            <div id="holidayContent"></div>
                        </div>
                    `;
                    
                    document.querySelectorAll('.tab-btn').forEach(btn => {
                        btn.addEventListener('click', function() {
                            const category = this.dataset.category;
                            renderHolidays(category);
                        });
                    });
                    
                    // 绑定全选复选框事件（需要在renderHolidays后绑定）
                    document.addEventListener('click', function(e) {
                        if (e.target.id === 'selectAllHolidays') {
                            const isChecked = e.target.checked;
                            document.querySelectorAll('.holiday-checkbox').forEach(checkbox => {
                                checkbox.checked = isChecked;
                            });
                        }
                    });
                    
                    // 绑定批量分类按钮点击事件
                    document.addEventListener('click', function(e) {
                        if (e.target.closest('#batchCategoryBtn')) {
                            const selectedCheckboxes = document.querySelectorAll('.holiday-checkbox:checked');
                            if (selectedCheckboxes.length === 0) {
                                alert('请至少选择一个节日');
                                return;
                            }
                            
                            // 获取选中的节日ID
                            const selectedIds = Array.from(selectedCheckboxes).map(checkbox => checkbox.dataset.id);
                            
                            // 显示批量分类对话框
                            const dialogContent = `
                                <div style="padding: 20px;">
                                    <h3 style="margin-top: 0;">批量设置分类</h3>
                                    <div style="margin-bottom: 20px;">
                                        <label style="display: block; margin-bottom: 8px; font-weight: 500;">选择分类</label>
                                        <select id="batchCategory" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                                            <option value="statutory">法定节日</option>
                                            <option value="traditional">中国传统节日</option>
                                        </select>
                                    </div>
                                    <div style="margin-top: 30px; display: flex; gap: 10px; justify-content: flex-end;">
                                        <button id="batchCancelBtn" class="btn btn-secondary" style="padding: 10px 20px;">取消</button>
                                        <button id="batchConfirmBtn" class="btn btn-primary" style="padding: 10px 20px;">确定</button>
                                    </div>
                                </div>
                            `;
                            
                            // 创建对话框
                            const dialog = document.createElement('div');
                            dialog.style.cssText = `
                                position: fixed;
                                top: 0;
                                left: 0;
                                width: 100%;
                                height: 100%;
                                background: rgba(0, 0, 0, 0.5);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                z-index: 10000;
                            `;
                            
                            const dialogBody = document.createElement('div');
                            dialogBody.style.cssText = `
                                background: white;
                                border-radius: 8px;
                                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                                width: 400px;
                                max-width: 90%;
                            `;
                            dialogBody.innerHTML = dialogContent;
                            dialog.appendChild(dialogBody);
                            document.body.appendChild(dialog);
                            
                            // 绑定取消按钮事件
                            dialogBody.querySelector('#batchCancelBtn').addEventListener('click', function() {
                                document.body.removeChild(dialog);
                            });
                            
                            // 绑定确定按钮事件
                            dialogBody.querySelector('#batchConfirmBtn').addEventListener('click', async function() {
                                const category = dialogBody.querySelector('#batchCategory').value;
                                
                                try {
                                    // 批量更新节日分类
                                    const response = await fetch('/jg/api/batch-update-holiday-category.php', {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({ ids: selectedIds, category: category })
                                    });
                                    
                                    const data = await response.json();
                                    
                                    if (data.success) {
                                        alert('批量更新分类成功');
                                        renderHolidays('all');
                                    } else {
                                        alert('批量更新分类失败：' + data.error);
                                    }
                                } catch (error) {
                                    console.error('批量更新分类失败:', error);
                                    alert('批量更新分类失败，请稍后重试');
                                }
                                
                                document.body.removeChild(dialog);
                            });
                        }
                    });
                    
                    renderHolidays('all');
                } else {
                    content.innerHTML = '<div class="message error">' + data.error + '</div>';
                }
            } catch (error) {
                console.error('加载节假日列表失败:', error);
                content.innerHTML = '<div class="message error">加载节假日列表失败，请稍后重试</div>';
            }
        }
        
        // 加载数据统计
        async function loadStatistics() {
            const content = document.getElementById('pageContent');
            
            // 显示加载状态
            content.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">数据统计</h3>
                    </div>
                    <div class="loading">
                        <div class="loading-spinner"></div>
                    </div>
                </div>
            `;
            
            try {
                // 获取统计数据
                const [usersCount, projectsCount, attendanceCount, holidaysCount, expensesCount] = await Promise.all([
                    fetch('/jg/api/get-users.php').then(r => r.json()),
                    fetch('/jg/api/get-projects.php?admin=1').then(r => r.json()).catch(() => ({ success: true, projects: [] })),
                    fetch('/jg/api/get-attendance.php').then(r => r.json()).catch(() => ({ success: true, attendance: [] })),
                    fetch('/jg/api/get-holidays.php').then(r => r.json()).catch(() => ({ success: true, holidays: [] })),
                    fetch('/jg/api/get-expenses.php').then(r => r.json()).catch(() => ({ success: true, expenses: [] }))
                ]);
                
                const totalUsers = usersCount.success ? usersCount.users.length : 0;
                const totalProjects = projectsCount.success ? projectsCount.projects.length : 0;
                const totalAttendance = attendanceCount.success ? attendanceCount.attendance.length : 0;
                const totalHolidays = holidaysCount.success ? holidaysCount.holidays.length : 0;
                
                // 计算报销总金额
                let totalExpenses = 0;
                if (expensesCount.success && expensesCount.expenses.length > 0) {
                    totalExpenses = expensesCount.expenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);
                }
                
                // 计算考勤统计
                let presentCount = 0;
                let halfCount = 0;
                let absentCount = 0;
                
                if (attendanceCount.success && attendanceCount.attendance.length > 0) {
                    attendanceCount.attendance.forEach(record => {
                        switch (record.status) {
                            case 'present':
                                presentCount++;
                                break;
                            case 'half':
                                halfCount++;
                                break;
                            case 'absent':
                                absentCount++;
                                break;
                        }
                    });
                }
                
                // 计算项目状态统计
                let activeProjects = 0;
                let endedProjects = 0;
                
                if (projectsCount.success && projectsCount.projects.length > 0) {
                    projectsCount.projects.forEach(project => {
                        if (project.isEnded) {
                            endedProjects++;
                        } else {
                            activeProjects++;
                        }
                    });
                }
                
                // 生成统计HTML
                content.innerHTML = `
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-icon users">
                                <i class="fas fa-users"></i>
                            </div>
                            <div class="stat-info">
                                <h3>${totalUsers}</h3>
                                <p>总用户数</p>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon projects">
                                <i class="fas fa-project-diagram"></i>
                            </div>
                            <div class="stat-info">
                                <h3>${totalProjects}</h3>
                                <p>项目数量</p>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon attendance">
                                <i class="fas fa-clipboard-list"></i>
                            </div>
                            <div class="stat-info">
                                <h3>${totalAttendance}</h3>
                                <p>考勤记录</p>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon holidays">
                                <i class="fas fa-calendar-alt"></i>
                            </div>
                            <div class="stat-info">
                                <h3>${totalHolidays}</h3>
                                <p>节假日</p>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon expenses">
                                <i class="fas fa-receipt"></i>
                            </div>
                            <div class="stat-info">
                                <h3>¥${totalExpenses.toFixed(2)}</h3>
                                <p>报销金额</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">考勤状态统计</h3>
                        </div>
                        <div style="padding: 20px;">
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                                <div style="background: rgba(6, 182, 212, 0.1); padding: 20px; border-radius: 12px; text-align: center; border: 1px solid rgba(6, 182, 212, 0.2);">
                                    <h4 style="color: #34d399; font-size: 24px; margin: 0; text-shadow: 0 0 10px rgba(52, 211, 153, 0.5);">${presentCount}</h4>
                                    <p style="color: #64748b; margin: 8px 0 0 0;">出勤</p>
                                </div>
                                <div style="background: rgba(245, 158, 11, 0.1); padding: 20px; border-radius: 12px; text-align: center; border: 1px solid rgba(245, 158, 11, 0.2);">
                                    <h4 style="color: #fbbf24; font-size: 24px; margin: 0; text-shadow: 0 0 10px rgba(251, 191, 36, 0.5);">${halfCount}</h4>
                                    <p style="color: #64748b; margin: 8px 0 0 0;">半天</p>
                                </div>
                                <div style="background: rgba(239, 68, 68, 0.1); padding: 20px; border-radius: 12px; text-align: center; border: 1px solid rgba(239, 68, 68, 0.2);">
                                    <h4 style="color: #f87171; font-size: 24px; margin: 0; text-shadow: 0 0 10px rgba(248, 113, 113, 0.5);">${absentCount}</h4>
                                    <p style="color: #64748b; margin: 8px 0 0 0;">缺勤</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">项目状态统计</h3>
                        </div>
                        <div style="padding: 20px;">
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                                <div style="background: rgba(6, 182, 212, 0.1); padding: 20px; border-radius: 12px; text-align: center; border: 1px solid rgba(6, 182, 212, 0.2);">
                                    <h4 style="color: #22d3ee; font-size: 24px; margin: 0; text-shadow: 0 0 10px rgba(34, 211, 238, 0.5);">${activeProjects}</h4>
                                    <p style="color: #64748b; margin: 8px 0 0 0;">进行中项目</p>
                                </div>
                                <div style="background: rgba(148, 163, 184, 0.1); padding: 20px; border-radius: 12px; text-align: center; border: 1px solid rgba(148, 163, 184, 0.2);">
                                    <h4 style="color: #94a3b8; font-size: 24px; margin: 0; text-shadow: 0 0 10px rgba(148, 163, 184, 0.5);">${endedProjects}</h4>
                                    <p style="color: #64748b; margin: 8px 0 0 0;">已结束项目</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            } catch (error) {
                console.error('加载数据统计失败:', error);
                content.innerHTML = '<div class="message error">加载数据统计失败，请稍后重试</div>';
            }
        }
        
        // 加载系统设置
        function loadSettings() {
            const content = document.getElementById('pageContent');
            
            // 生成系统设置HTML
            content.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">系统设置</h3>
                    </div>
                    <div style="padding: 20px;">
                        <form id="settingsForm">
                            <div class="form-group" style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">系统名称</label>
                                <input type="text" id="systemName" value="考勤管理系统" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                            
                            <div class="form-group" style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">登录设置</label>
                                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                                    <input type="checkbox" id="allowRememberPassword" checked>
                                    <label for="allowRememberPassword">允许记住密码</label>
                                </div>
                            </div>
                            

                            
                            <div class="form-group" style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">考勤设置</label>
                                <div style="display: flex; flex-wrap: wrap; gap: 20px;">
                                    <div style="flex: 1; min-width: 200px;">
                                        <label style="display: block; margin-bottom: 4px; font-size: 14px;">迟到阈值(分钟)</label>
                                        <input type="number" id="lateThreshold" value="10" min="0" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                    </div>
                                </div>
                            </div>
                            

                            
                            <div class="form-group" style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">密码设置</label>
                                <div style="display: flex; flex-wrap: wrap; gap: 20px;">
                                    <div style="flex: 1; min-width: 200px;">
                                        <label style="display: block; margin-bottom: 4px; font-size: 14px;">当前密码</label>
                                        <input type="password" id="currentPassword" placeholder="请输入当前密码" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                    </div>
                                    <div style="flex: 1; min-width: 200px;">
                                        <label style="display: block; margin-bottom: 4px; font-size: 14px;">新密码</label>
                                        <input type="password" id="newPassword" placeholder="请输入新密码" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                    </div>
                                    <div style="flex: 1; min-width: 200px;">
                                        <label style="display: block; margin-bottom: 4px; font-size: 14px;">确认新密码</label>
                                        <input type="password" id="confirmPassword" placeholder="请再次输入新密码" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="form-group" style="margin-bottom: 30px;">
                                <h4 style="margin-bottom: 15px; font-weight: 600;">自动备份设置</h4>
                                <p style="margin-bottom: 15px; color: #7f8c8d;">设置自动备份频率，系统将按设定的时间自动创建数据库备份。</p>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                                    <div>
                                        <label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px;">自动备份</label>
                                        <select id="autoBackupEnabled" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                                            <option value="true">启用</option>
                                            <option value="false">禁用</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px;">备份频率</label>
                                        <select id="backupFrequency" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                                            <option value="daily">每天</option>
                                            <option value="weekly">每周</option>
                                            <option value="monthly">每月</option>
                                        </select>
                                    </div>
                                </div>
                                <div style="display: grid; grid-template-columns: 1fr; gap: 20px; margin-bottom: 20px;">
                                    <div>
                                        <label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px;">备份时间</label>
                                        <input type="time" id="backupTime" value="02:00" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                                        <p style="font-size: 12px; color: #7f8c8d; margin-top: 5px;">设置每天的备份时间（24小时制）</p>
                                    </div>
                                </div>
                                <div style="display: grid; grid-template-columns: 1fr; gap: 20px; margin-bottom: 20px;">
                                    <div>
                                        <label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px;">保留备份数量</label>
                                        <input type="number" id="backupRetention" value="7" min="1" max="30" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                                        <p style="font-size: 12px; color: #7f8c8d; margin-top: 5px;">设置保留的备份文件数量，超过后会自动删除最旧的备份</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="form-group" style="margin-bottom: 20px;">
                                <h4 style="margin-bottom: 15px; font-weight: 600;">版本管理</h4>
                                <p style="margin-bottom: 15px; color: #7f8c8d;">管理应用版本号，更新代码后修改版本号以强制用户刷新缓存。</p>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                                    <div>
                                        <label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px;">当前版本号</label>
                                        <input type="text" id="currentVersion" readonly style="width: 100%; padding: 10px; border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 8px; font-size: 14px; background: rgba(30, 41, 59, 0.6); color: #94a3b8;">
                                    </div>
                                    <div>
                                        <label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px;">新版本号</label>
                                        <input type="text" id="newVersion" placeholder="例如: 1.0.1" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                                    </div>
                                </div>
                                <button type="button" id="updateVersionBtn" class="btn btn-primary" style="padding: 10px 20px;">
                                    <i class="fas fa-code-branch"></i> 更新版本号
                                </button>
                            </div>
                            
                            <div style="margin-top: 30px; display: flex; gap: 10px;">
                                <button type="button" id="saveSettingsBtn" class="btn btn-primary" style="padding: 10px 20px;">
                                    <i class="fas fa-save"></i> 保存设置
                                </button>
                                <button type="button" id="changePasswordBtn" class="btn btn-secondary" style="padding: 10px 20px;">
                                    <i class="fas fa-key"></i> 修改密码
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            
            // 加载保存的设置
            async function loadSavedSettings() {
                try {
                    // 从数据库加载设置
                    const response = await fetch('/jg/api/get-settings.php');
                    const result = await response.json();
                    
                    if (result.success && result.settings) {
                        const settings = result.settings;
                        document.getElementById('systemName').value = settings.systemName || '考勤管理系统';
                        document.getElementById('allowRememberPassword').checked = settings.allowRememberPassword !== false;
                        document.getElementById('lateThreshold').value = settings.lateThreshold || 10;
                        
                        // 加载自动备份设置
                        document.getElementById('autoBackupEnabled').value = settings.autoBackupEnabled !== false ? 'true' : 'false';
                        document.getElementById('backupFrequency').value = settings.backupFrequency || 'weekly';
                        document.getElementById('backupTime').value = settings.backupTime || '02:00';
                        document.getElementById('backupRetention').value = settings.backupRetention || 2;
                        
                        // 将数据库中的设置保存到localStorage
                        localStorage.setItem('systemSettings', JSON.stringify(settings));
                        console.log('设置已从数据库加载');
                    } else {
                        // 从localStorage加载设置
                        const savedSettings = localStorage.getItem('systemSettings');
                        if (savedSettings) {
                            const settings = JSON.parse(savedSettings);
                            document.getElementById('systemName').value = settings.systemName || '考勤管理系统';
                            document.getElementById('allowRememberPassword').checked = settings.allowRememberPassword !== false;
                            document.getElementById('lateThreshold').value = settings.lateThreshold || 10;
                            
                            // 加载自动备份设置
                            document.getElementById('autoBackupEnabled').value = settings.autoBackupEnabled !== false ? 'true' : 'false';
                            document.getElementById('backupFrequency').value = settings.backupFrequency || 'weekly';
                            document.getElementById('backupTime').value = settings.backupTime || '02:00';
                            document.getElementById('backupRetention').value = settings.backupRetention || 2;
                            console.log('设置已从localStorage加载');
                        } else {
                            // 如果没有保存的设置，使用默认值
                            document.getElementById('systemName').value = '考勤管理系统';
                            document.getElementById('allowRememberPassword').checked = true;
                            document.getElementById('lateThreshold').value = 10;
                            
                            // 默认自动备份设置
                            document.getElementById('autoBackupEnabled').value = 'true';
                            document.getElementById('backupFrequency').value = 'weekly';
                            document.getElementById('backupTime').value = '02:00';
                            document.getElementById('backupRetention').value = 2;
                            console.log('使用默认设置');
                        }
                    }
                } catch (error) {
                    console.error('加载设置失败:', error);
                    // 加载失败时使用默认值
                    document.getElementById('systemName').value = '考勤管理系统';
                    document.getElementById('allowRememberPassword').checked = true;
                    document.getElementById('lateThreshold').value = 10;
                    
                    // 默认自动备份设置
                    document.getElementById('autoBackupEnabled').value = 'true';
                    document.getElementById('backupFrequency').value = 'weekly';
                    document.getElementById('backupTime').value = '02:00';
                    document.getElementById('backupRetention').value = 2;
                }
            }
            
            // 绑定保存设置按钮点击事件
            document.getElementById('saveSettingsBtn').addEventListener('click', async function() {
                // 获取设置值
                const settings = {
                    systemName: document.getElementById('systemName').value,
                    allowRememberPassword: document.getElementById('allowRememberPassword').checked,
                    lateThreshold: document.getElementById('lateThreshold').value,
                    
                    // 自动备份设置
                    autoBackupEnabled: document.getElementById('autoBackupEnabled').value === 'true',
                    backupFrequency: document.getElementById('backupFrequency').value,
                    backupTime: document.getElementById('backupTime').value,
                    backupRetention: parseInt(document.getElementById('backupRetention').value) || 2
                };
                
                // 保存设置到localStorage
                try {
                    localStorage.setItem('systemSettings', JSON.stringify(settings));
                    
                    // 保存设置到数据库
                    const response = await fetch('/jg/api/save-settings.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ settings: settings })
                    });
                    
                    const result = await response.json();
                    if (result.success) {
                        console.log('设置已保存到数据库');
                    } else {
                        console.error('保存设置到数据库失败:', result.message);
                    }
                    
                    // 重新加载系统名称
                    await loadAdminSystemName();
                    alert('设置已保存');
                    console.log('保存的设置:', settings);
                } catch (error) {
                    console.error('保存设置失败:', error);
                    alert('保存设置失败，请稍后重试');
                }
            });
            
            // 加载保存的设置
            loadSavedSettings();
            
            // 绑定修改密码按钮点击事件
            document.getElementById('changePasswordBtn').addEventListener('click', async function() {
                const currentPassword = document.getElementById('currentPassword').value;
                const newPassword = document.getElementById('newPassword').value;
                const confirmPassword = document.getElementById('confirmPassword').value;
                
                // 验证输入
                if (!currentPassword) {
                    alert('请输入当前密码');
                    return;
                }
                
                if (!newPassword) {
                    alert('请输入新密码');
                    return;
                }
                
                if (newPassword.length < 5) {
                    alert('新密码长度至少为5位');
                    return;
                }
                
                // 验证密码复杂度
                if (!/^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{5,}$/.test(newPassword)) {
                    alert('新密码必须包含至少一个字母和一个数字');
                    return;
                }
                
                if (newPassword !== confirmPassword) {
                    alert('两次输入的新密码不一致');
                    return;
                }
                
                try {
                    // 发送请求修改密码
                    const response = await fetch('/jg/api/admin-change-password.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            currentPassword: currentPassword,
                            newPassword: newPassword
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        alert('密码修改成功');
                        // 清空密码输入框
                        document.getElementById('currentPassword').value = '';
                        document.getElementById('newPassword').value = '';
                        document.getElementById('confirmPassword').value = '';
                    } else {
                        alert('密码修改失败：' + data.error);
                    }
                } catch (error) {
                    console.error('修改密码失败:', error);
                    alert('修改密码失败，请稍后重试');
                }
            });
            
            // 加载当前版本号
            loadCurrentVersion();
            
            // 绑定更新版本号按钮点击事件
            document.getElementById('updateVersionBtn').addEventListener('click', updateVersion);
        }
        
        // 删除备份
        async function deleteBackup(backupName) {
            if (!confirm('确定要删除这个备份文件吗？')) {
                return;
            }
            
            try {
                const response = await fetch('/jg/api/delete-backup.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ backupName: backupName })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert('备份删除成功');
                    // 重新加载备份列表
                    loadDatabase();
                } else {
                    alert('备份删除失败：' + data.error);
                }
            } catch (error) {
                console.error('删除备份失败:', error);
                alert('删除备份失败，请稍后重试');
            }
        }
        
        // 加载数据库管理
        async function loadDatabase() {
            const content = document.getElementById('pageContent');
            
            // 显示加载状态
            content.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">数据库管理</h3>
                    </div>
                    <div class="loading">
                        <div class="loading-spinner"></div>
                    </div>
                </div>
            `;
            
            try {
                // 获取备份列表
                const response = await fetch('/jg/api/get-backups.php');
                const backupsData = await response.json();
                const backups = backupsData.success ? backupsData.backups : [];
                
                // 检测屏幕尺寸
                const isMobile = window.innerWidth <= 768;
                
                // 生成备份列表HTML
                let backupsHtml = '';
                if (backups.length > 0) {
                    if (isMobile) {
                        // 移动端使用卡片布局
                        backupsHtml = `
                            <div class="backup-cards" style="margin-top: 15px; display: grid; grid-template-columns: 1fr; gap: 15px;">
                                ${backups.map(backup => `
                                    <div class="backup-card" style="background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(6, 182, 212, 0.2); border-radius: 12px; padding: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                                        <div class="backup-card-header" style="margin-bottom: 10px;">
                                            <div class="backup-card-title" style="font-weight: 600; margin-bottom: 5px; word-break: break-all;">${backup.name}</div>
                                        </div>
                                        <div class="backup-card-info" style="margin-bottom: 15px;">
                                            <div class="backup-card-info-item" style="margin-bottom: 5px;">
                                                <span style="font-weight: 500;">大小:</span> ${(backup.size / 1024).toFixed(2)} KB
                                            </div>
                                            <div class="backup-card-info-item">
                                                <span style="font-weight: 500;">创建时间:</span> ${backup.modified}
                                            </div>
                                        </div>
                                        <div class="backup-card-actions" style="display: flex; gap: 10px;">
                                            <a href="/jg/backups/${backup.name}" class="btn btn-secondary" style="flex: 1; padding: 8px 12px; font-size: 14px; text-align: center;">
                                                <i class="fas fa-download"></i> 下载
                                            </a>
                                            <button class="btn btn-danger" style="flex: 1; padding: 8px 12px; font-size: 14px; text-align: center;" onclick="deleteBackup('${backup.name}')">
                                                <i class="fas fa-trash"></i> 删除
                                            </button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        `;
                    } else {
                        // 桌面端使用表格布局
                        backupsHtml = `
                            <table class="table" style="margin-top: 15px;">
                                <thead>
                                    <tr>
                                        <th>文件名</th>
                                        <th>大小</th>
                                        <th>创建时间</th>
                                        <th>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${backups.map(backup => `
                                        <tr>
                                            <td style="word-break: break-all;">${backup.name}</td>
                                            <td>${(backup.size / 1024).toFixed(2)} KB</td>
                                            <td>${backup.modified}</td>
                                            <td style="display: flex; gap: 8px;">
                                                <a href="/jg/backups/${backup.name}" class="btn btn-secondary" style="flex: 1; min-width: 80px; padding: 4px 12px; font-size: 12px; text-align: center;">
                                                    <i class="fas fa-download"></i> 下载
                                                </a>
                                                <button class="btn btn-danger" style="flex: 1; min-width: 80px; padding: 4px 12px; font-size: 12px; text-align: center;" onclick="deleteBackup('${backup.name}')">
                                                    <i class="fas fa-trash"></i> 删除
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        `;
                    }
                } else {
                    backupsHtml = `<div style="text-align: center; padding: 20px; color: #7f8c8d;">暂无备份文件</div>`;
                }
                
                // 生成数据库管理HTML
                content.innerHTML = `
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">数据库管理</h3>
                        </div>
                        <div style="padding: 20px;">
                            <div class="form-group" style="margin-bottom: 30px;">
                                <h4 style="margin-bottom: 15px; font-weight: 600;">数据库备份</h4>
                                <p style="margin-bottom: 15px; color: #7f8c8d;">创建数据库的完整备份，以防止数据丢失。</p>
                                <button type="button" id="backupDatabaseBtn" class="btn btn-primary" style="padding: 10px 20px;">
                                    <i class="fas fa-download"></i> 创建备份
                                </button>
                            </div>
                            
                            <div class="form-group" style="margin-bottom: 30px;">
                                <h4 style="margin-bottom: 15px; font-weight: 600;">备份列表</h4>
                                ${backupsHtml}
                            </div>
                            
                            <div class="form-group" style="margin-bottom: 30px;">
                                <h4 style="margin-bottom: 15px; font-weight: 600;">数据库恢复</h4>
                                <p style="margin-bottom: 15px; color: #7f8c8d;">从备份文件恢复数据库。<strong style="color: #e74c3c;">注意：这将覆盖当前数据库中的所有数据。</strong></p>
                                <input type="file" id="backupFile" accept=".sql" style="margin-bottom: 15px;">
                                <button type="button" id="restoreDatabaseBtn" class="btn btn-danger" style="padding: 10px 20px;">
                                    <i class="fas fa-upload"></i> 恢复数据库
                                </button>
                            </div>
                            
                            <div class="form-group">
                                <h4 style="margin-bottom: 15px; font-weight: 600;">数据库信息</h4>
                                <div id="databaseInfo" style="background: rgba(6, 182, 212, 0.1); padding: 16px; border-radius: 8px; border: 1px solid rgba(6, 182, 212, 0.2);">
                                    <p style="margin: 8px 0; color: #94a3b8;"><strong style="color: #22d3ee;">数据库类型:</strong> SQLite</p>
                                    <p style="margin: 8px 0; color: #94a3b8;"><strong style="color: #22d3ee;">数据库文件:</strong> database.db</p>
                                    <p style="margin: 8px 0; color: #94a3b8;"><strong style="color: #22d3ee;">状态:</strong> <span style="color: #34d399;">正常</span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                // 绑定备份数据库按钮点击事件
                document.getElementById('backupDatabaseBtn').addEventListener('click', async function() {
                    const btn = this;
                    const originalText = btn.innerHTML;
                    
                    try {
                        // 禁用按钮并显示加载状态
                        btn.disabled = true;
                        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 备份中...';
                        
                        // 调用备份API
                        const response = await fetch('/jg/api/backup-database.php', {
                            method: 'POST'
                        });
                        
                        const data = await response.json();
                        
                        if (data.success) {
                            alert('数据库备份成功');
                            // 重新加载页面以显示新的备份
                            loadDatabase();
                        } else {
                            alert('备份失败: ' + data.error);
                        }
                    } catch (error) {
                        console.error('备份失败:', error);
                        alert('备份失败，请稍后重试');
                    } finally {
                        // 恢复按钮状态
                        btn.disabled = false;
                        btn.innerHTML = originalText;
                    }
                });
                
                // 绑定恢复数据库按钮点击事件
                document.getElementById('restoreDatabaseBtn').addEventListener('click', async function() {
                    const backupFile = document.getElementById('backupFile').files[0];
                    if (!backupFile) {
                        alert('请选择备份文件');
                        return;
                    }
                    
                    if (!confirm('确定要恢复数据库吗？这将覆盖当前所有数据。')) {
                        return;
                    }
                    
                    const btn = this;
                    const originalText = btn.innerHTML;
                    
                    try {
                        // 禁用按钮并显示加载状态
                        btn.disabled = true;
                        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 恢复中...';
                        
                        // 创建FormData对象
                        const formData = new FormData();
                        formData.append('backup_file', backupFile);
                        
                        // 调用恢复API
                        const response = await fetch('/jg/api/restore-database.php', {
                            method: 'POST',
                            body: formData
                        });
                        
                        const data = await response.json();
                        
                        if (data.success) {
                            alert('数据库恢复成功');
                        } else {
                            alert('恢复失败: ' + data.error);
                        }
                    } catch (error) {
                        console.error('恢复失败:', error);
                        alert('恢复失败，请稍后重试');
                    } finally {
                        // 恢复按钮状态
                        btn.disabled = false;
                        btn.innerHTML = originalText;
                    }
                });
            } catch (error) {
                console.error('加载数据库管理失败:', error);
                content.innerHTML = '<div class="message error">加载数据库管理失败，请稍后重试</div>';
            }
        }
        
        // 搜索用户
        function searchUsers() {
            const searchTerm = document.getElementById('userSearch').value.toLowerCase();
            
            // 检查是否是卡片布局
            const userCards = document.querySelectorAll('#usersTable .user-card');
            if (userCards.length > 0) {
                // 处理卡片布局
                userCards.forEach(card => {
                    const name = card.querySelector('.user-card-title').textContent.toLowerCase();
                    const phone = card.querySelector('.user-card-info-value').textContent.toLowerCase();
                    
                    if (name.includes(searchTerm) || phone.includes(searchTerm)) {
                        card.style.display = '';
                    } else {
                        card.style.display = 'none';
                    }
                });
            } else {
                // 处理表格布局
                const rows = document.querySelectorAll('#usersTable tbody tr');
                rows.forEach(row => {
                    const name = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
                    const phone = row.querySelector('td:nth-child(3)').textContent.toLowerCase();
                    
                    if (name.includes(searchTerm) || phone.includes(searchTerm)) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                });
            }
        }
        
        // 查看用户详情 - 在新窗口中打开用户工资页面
        function viewUser(userId) {
            // 在新窗口中打开用户工资页面，带上管理员标记
            window.open(`/jg/html-new/worker-wage.php?worker_id=${userId}&admin_view=1`, '_blank', 'width=1000,height=800');
        }
        
        // 查看用户考勤状态
        function viewUserAttendanceStatus(userId) {
            // 在新窗口中打开用户考勤状态页面，带上管理员标记
            window.open(`/jg/html-new/attendance-status.php?user_id=${userId}&admin_view=1`, '_blank', 'width=800,height=600');
        }
        
        // 编辑用户信息
        async function editUser(userId) {
            try {
                // 获取用户信息
                const response = await fetch(`/jg/api/get-user-info.php?user_id=${userId}`);
                const data = await response.json();
                
                if (data.success) {
                    const user = data.user;
                    
                    // 显示编辑对话框
                    const dialog = document.createElement('div');
                    dialog.id = 'editUserDialog';
                    dialog.style.cssText = `
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background-color: rgba(0, 0, 0, 0.5);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 10000;
                    `;
                    
                    const dialogContent = document.createElement('div');
                    dialogContent.style.cssText = `
                        background-color: white;
                        padding: 30px;
                        border-radius: 8px;
                        width: 90%;
                        max-width: 500px;
                        max-height: 80vh;
                        overflow-y: auto;
                    `;
                    
                    dialogContent.innerHTML = `
                        <h3 style="margin-bottom: 20px; color: #2c3e50;">编辑用户信息</h3>
                        <form id="editUserForm">
                            <input type="hidden" name="userId" value="${userId}">
                            <div style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 5px; font-size: 14px; font-weight: 500;">姓名</label>
                                <input type="text" name="name" value="${user.name || ''}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                            <div style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 5px; font-size: 14px; font-weight: 500;">邮箱</label>
                                <input type="email" name="email" value="${user.email === '未设置' ? '' : user.email}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                            <div style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 5px; font-size: 14px; font-weight: 500;">电话</label>
                                <input type="tel" name="phone" value="${user.phone}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                            <div style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 5px; font-size: 14px; font-weight: 500;">身份证号</label>
                                <input type="text" name="idNumber" value="${user.idNumber === '未设置' ? '' : user.idNumber}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                            <div style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 5px; font-size: 14px; font-weight: 500;">工种</label>
                                <input type="text" name="job" value="${user.job === '未设置' ? '' : user.job}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                            <div style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 5px; font-size: 14px; font-weight: 500;">日薪</label>
                                <input type="number" name="wage" value="${user.wage || 0}" step="0.01" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                            <div style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 5px; font-size: 14px; font-weight: 500;">月薪</label>
                                <input type="number" name="monthlyWage" value="${user.monthlyWage || 0}" step="0.01" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                            <div style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 5px; font-size: 14px; font-weight: 500;">加班费倍率</label>
                                <input type="number" name="overtimeRate" value="${user.overtimeRate || 0}" step="0.1" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                            <div style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 5px; font-size: 14px; font-weight: 500;">角色</label>
                                <select name="role" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                    <option value="worker" ${user.role === 'worker' ? 'selected' : ''}>普通工人</option>
                                    <option value="foreman" ${user.role === 'foreman' ? 'selected' : ''}>工头</option>
                                </select>
                            </div>
                            <div style="display: flex; gap: 10px; margin-top: 20px;">
                                <button type="button" onclick="saveUserInfo()" class="btn btn-primary" style="flex: 1;">保存</button>
                                <button type="button" onclick="document.getElementById('editUserDialog').remove()" class="btn btn-secondary" style="flex: 1;">取消</button>
                            </div>
                        </form>
                    `;
                    
                    dialog.appendChild(dialogContent);
                    document.body.appendChild(dialog);
                    
                    // 保存用户信息函数
                    window.saveUserInfo = async function() {
                        const form = document.getElementById('editUserForm');
                        const formData = new FormData(form);
                        const userId = formData.get('userId');
                        
                        try {
                            // 逐个字段更新
                            const fields = ['name', 'email', 'phone', 'idNumber', 'job', 'wage', 'monthlyWage', 'overtimeRate'];
                            
                            for (const field of fields) {
                                const value = formData.get(field);
                                if (value !== null && value !== undefined) {
                                    const response = await fetch('/jg/api/update-user-info.php', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ user_id: userId, field: field, value: value })
                                    });
                                    
                                    const result = await response.json();
                                    if (!result.success) {
                                        throw new Error(`更新${field}失败: ${result.error}`);
                                    }
                                }
                            }
                            
                            // 更新用户角色
                            const role = formData.get('role');
                            if (role !== null && role !== undefined) {
                                const response = await fetch('/jg/api/user-role.php', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        action: 'updateRole',
                                        user_id: 'admin', // 管理员操作
                                        target_user_id: userId,
                                        role: role,
                                        csrf_token: 'admin_token' // 管理员操作使用固定token
                                    })
                                });
                                
                                const result = await response.json();
                                if (!result.success) {
                                    throw new Error(`更新角色失败: ${result.error}`);
                                }
                            }
                            
                            // 关闭对话框
                            document.getElementById('editUserDialog').remove();
                            
                            // 刷新用户列表
                            loadUsers();
                            
                            // 显示成功消息
                            alert('用户信息更新成功');
                        } catch (error) {
                            console.error('保存用户信息失败:', error);
                            alert('保存失败: ' + error.message);
                        }
                    };
                } else {
                    alert('获取用户信息失败: ' + data.error);
                }
            } catch (error) {
                console.error('编辑用户信息失败:', error);
                alert('编辑用户信息失败，请稍后重试');
            }
        }
        
        // 删除用户
        async function deleteUser(userId) {
            if (confirm('确定要删除这个用户吗？')) {
                try {
                    const response = await fetch('/jg/api/delete-user.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ id: userId })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        // 重新加载用户列表
                        loadPage('users');
                    } else {
                        alert('删除用户失败：' + data.error);
                    }
                } catch (error) {
                    console.error('删除用户失败:', error);
                    alert('删除用户失败，请稍后重试');
                }
            }
        }
        
        // 重置用户密码
        async function resetUserPassword(userId) {
            if (confirm('确定要重置该用户的密码吗？重置后密码将变为默认值"123456"')) {
                try {
                    const response = await fetch('/jg/api/reset-password.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ id: userId })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        alert('密码重置成功，新密码为：123456');
                        // 重新加载用户列表
                        loadPage('users');
                    } else {
                        alert('密码重置失败：' + data.error);
                    }
                } catch (error) {
                    console.error('重置密码失败:', error);
                    alert('重置密码失败，请稍后重试');
                }
            }
        }
        
        // 查看项目详情
        async function viewProject(projectId) {
            const content = document.getElementById('pageContent');
            
            // 显示加载状态
            content.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">项目详情</h3>
                        <button type="button" class="btn btn-secondary" onclick="loadPage('projects')">
                            <i class="fas fa-arrow-left"></i> 返回
                        </button>
                    </div>
                    <div class="loading">
                        <div class="loading-spinner"></div>
                    </div>
                </div>
            `;
            
            try {
                // 获取项目详情
                const projectResponse = await fetch('/jg/api/get-projects.php?admin=1');
                const projectData = await projectResponse.json();
                const project = projectData.success ? projectData.projects.find(p => p.id === projectId) : null;
                
                if (!project) {
                    content.innerHTML = `
                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title">项目详情</h3>
                                <button type="button" class="btn btn-secondary" onclick="loadPage('projects')">
                                    <i class="fas fa-arrow-left"></i> 返回
                                </button>
                            </div>
                            <div style="padding: 40px; text-align: center;">
                                <p style="color: #7f8c8d;">项目不存在</p>
                            </div>
                        </div>
                    `;
                    return;
                }
                
                // 获取已分配的员工
                const usersResponse = await fetch(`/jg/api/get-project-users.php?project_id=${projectId}`);
                const usersData = await usersResponse.json();
                const assignedUsers = usersData.success ? usersData.users : [];
                
                // 生成员工列表HTML
                let usersHtml = '';
                if (assignedUsers.length > 0) {
                    usersHtml = `
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>姓名</th>
                                    <th>手机号</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${assignedUsers.map(user => `
                                    <tr>
                                        <td>${user.name || '未设置姓名'}</td>
                                        <td>${user.phone}</td>
                                        <td>
                                            <button class="btn btn-danger" onclick="removeFromProject('${user.id}', '${project.id}')">
                                                <i class="fas fa-trash"></i> 移除
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `;
                } else {
                    usersHtml = '<div style="text-align: center; padding: 20px; color: #7f8c8d;">暂无已分配员工</div>';
                }
                
                // 生成项目详情HTML
                content.innerHTML = `
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">项目详情</h3>
                            <div style="display: flex; gap: 10px;">
                                <button type="button" class="btn btn-primary" onclick="assignEmployeesToProject('${project.id}')">
                                    <i class="fas fa-user-plus"></i> 分配员工
                                </button>
                                <button type="button" class="btn btn-secondary" onclick="loadPage('projects')">
                                    <i class="fas fa-arrow-left"></i> 返回
                                </button>
                            </div>
                        </div>
                        <div style="padding: 20px;">
                            <div class="form-group" style="margin-bottom: 30px;">
                                <h4 style="margin-bottom: 15px; font-weight: 600;">项目信息</h4>
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                                    <div style="background: rgba(6, 182, 212, 0.1); padding: 16px; border-radius: 8px; border: 1px solid rgba(6, 182, 212, 0.2);">
                                        <p style="margin: 8px 0; color: #94a3b8;"><strong style="color: #22d3ee;">项目ID:</strong> ${project.id}</p>
                                        <p style="margin: 8px 0; color: #94a3b8;"><strong style="color: #22d3ee;">项目名称:</strong> ${project.name}</p>
                                        <p style="margin: 8px 0; color: #94a3b8;"><strong style="color: #22d3ee;">项目地址:</strong> ${project.address || '-'}</p>
                                        <p style="margin: 8px 0; color: #94a3b8;"><strong style="color: #22d3ee;">项目状态:</strong> ${project.isEnded ? '<span style="color: #94a3b8;">已结束</span>' : '<span style="color: #34d399;">进行中</span>'}</p>
                                        <p style="margin: 8px 0; color: #94a3b8;"><strong style="color: #22d3ee;">创建时间:</strong> ${project.created_at || project.createdAt || '-'}</p>
                                    </div>
                                    <div style="background: rgba(6, 182, 212, 0.1); padding: 16px; border-radius: 8px; border: 1px solid rgba(6, 182, 212, 0.2);">
                                        <p style="margin: 8px 0; color: #94a3b8;"><strong style="color: #22d3ee;">项目描述:</strong></p>
                                        <p style="margin: 10px 0; line-height: 1.5; color: #94a3b8;">${project.description || '无'}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <h4 style="margin-bottom: 15px; font-weight: 600;">已分配员工</h4>
                                ${usersHtml}
                            </div>
                        </div>
                    </div>
                `;
            } catch (error) {
                console.error('加载项目详情失败:', error);
                content.innerHTML = `
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">项目详情</h3>
                            <button type="button" class="btn btn-secondary" onclick="loadPage('projects')">
                                <i class="fas fa-arrow-left"></i> 返回
                            </button>
                        </div>
                        <div style="padding: 40px; text-align: center;">
                            <p style="color: #e74c3c;">加载项目详情失败，请稍后重试</p>
                        </div>
                    </div>
                `;
            }
        }
        
        // 从项目中移除员工
        async function removeFromProject(userId, projectId) {
            if (confirm('确定要从项目中移除这个员工吗？')) {
                try {
                    const response = await fetch('/jg/api/remove-from-project.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ user_id: userId, project_id: projectId })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        alert('员工移除成功');
                        // 重新加载项目详情
                        viewProject(projectId);
                    } else {
                        alert('移除员工失败：' + data.error);
                    }
                } catch (error) {
                    console.error('移除员工失败:', error);
                    alert('移除员工失败，请稍后重试');
                }
            }
        }
        
        // 删除项目
        async function deleteProject(projectId) {
            if (confirm('确定要删除这个项目吗？')) {
                try {
                    const response = await fetch('/jg/api/delete-project.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ id: projectId })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        // 重新加载项目列表
                        loadPage('projects');
                    } else {
                        alert('删除项目失败：' + data.error);
                    }
                } catch (error) {
                    console.error('删除项目失败:', error);
                    alert('删除项目失败，请稍后重试');
                }
            }
        }
        
        // 查看考勤详情
        async function viewAttendance(attendanceId) {
            const content = document.getElementById('pageContent');
            
            // 显示加载状态
            content.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">考勤记录详情</h3>
                        <button type="button" class="btn btn-secondary" onclick="loadPage('attendance')">
                            <i class="fas fa-arrow-left"></i> 返回
                        </button>
                    </div>
                    <div class="loading">
                        <div class="loading-spinner"></div>
                    </div>
                </div>
            `;
            
            try {
                // 获取考勤记录详情
                const attendanceResponse = await fetch('/jg/api/get-attendance.php');
                const attendanceData = await attendanceResponse.json();
                const attendanceRecord = attendanceData.success ? attendanceData.attendance.find(record => record.id === attendanceId) : null;
                
                if (!attendanceRecord) {
                    content.innerHTML = `
                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title">考勤记录详情</h3>
                                <button type="button" class="btn btn-secondary" onclick="loadPage('attendance')">
                                    <i class="fas fa-arrow-left"></i> 返回
                                </button>
                            </div>
                            <div style="padding: 40px; text-align: center;">
                                <p style="color: #7f8c8d;">考勤记录不存在</p>
                            </div>
                        </div>
                    `;
                    return;
                }
                
                // 获取用户和项目信息
                const [usersResponse, projectsResponse] = await Promise.all([
                    fetch('/jg/api/get-users.php'),
                    fetch('/jg/api/get-projects.php?admin=1')
                ]);
                
                const usersData = await usersResponse.json();
                const projectsData = await projectsResponse.json();
                
                // 获取用户姓名
                let userName = attendanceRecord.user_id;
                if (usersData.success) {
                    const user = usersData.users.find(u => u.id === attendanceRecord.user_id);
                    if (user) {
                        userName = user.name || user.phone;
                    }
                }
                
                // 获取项目名称
                let projectName = attendanceRecord.projectId;
                if (projectsData.success) {
                    const project = projectsData.projects.find(p => p.id === attendanceRecord.projectId);
                    if (project) {
                        projectName = project.name;
                    }
                }
                
                // 生成考勤记录详情HTML
                content.innerHTML = `
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">考勤记录详情</h3>
                            <button type="button" class="btn btn-secondary" onclick="loadPage('attendance')">
                                <i class="fas fa-arrow-left"></i> 返回
                            </button>
                        </div>
                        <div style="padding: 20px;">
                            <div class="form-group" style="margin-bottom: 30px;">
                                <h4 style="margin-bottom: 15px; font-weight: 600;">考勤信息</h4>
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                                    <div style="background: rgba(6, 182, 212, 0.1); padding: 16px; border-radius: 8px; border: 1px solid rgba(6, 182, 212, 0.2);">
                                        <p style="margin: 8px 0; color: #94a3b8;"><strong style="color: #22d3ee;">考勤ID:</strong> ${attendanceRecord.id}</p>
                                        <p style="margin: 8px 0; color: #94a3b8;"><strong style="color: #22d3ee;">用户:</strong> ${userName}</p>
                                        <p style="margin: 8px 0; color: #94a3b8;"><strong style="color: #22d3ee;">用户ID:</strong> ${attendanceRecord.user_id}</p>
                                        <p style="margin: 8px 0; color: #94a3b8;"><strong style="color: #22d3ee;">项目:</strong> ${projectName}</p>
                                        <p style="margin: 8px 0; color: #94a3b8;"><strong style="color: #22d3ee;">项目ID:</strong> ${attendanceRecord.projectId}</p>
                                    </div>
                                    <div style="background: rgba(6, 182, 212, 0.1); padding: 16px; border-radius: 8px; border: 1px solid rgba(6, 182, 212, 0.2);">
                                        <p style="margin: 8px 0; color: #94a3b8;"><strong style="color: #22d3ee;">日期:</strong> ${attendanceRecord.date}</p>
                                        <p style="margin: 8px 0; color: #94a3b8;"><strong style="color: #22d3ee;">上班打卡:</strong> ${attendanceRecord.checkIn || '<span style="color: #f87171;">未打卡</span>'}</p>
                                        <p style="margin: 8px 0; color: #94a3b8;"><strong style="color: #22d3ee;">下班打卡:</strong> ${attendanceRecord.checkOut || '<span style="color: #f87171;">未打卡</span>'}</p>
                                        <p style="margin: 8px 0; color: #94a3b8;"><strong style="color: #22d3ee;">状态:</strong> ${attendanceRecord.status === 'present' ? '<span style="color: #34d399;">出勤</span>' : attendanceRecord.status === 'half' ? '<span style="color: #fbbf24;">半天</span>' : '<span style="color: #f87171;">缺勤</span>'}</p>
                                        <p style="margin: 5px 0;"><strong>工作时长:</strong> ${attendanceRecord.workHours || 0} 小时</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="form-group" style="margin-top: 30px;">
                                <h4 style="margin-bottom: 15px; font-weight: 600;">操作</h4>
                                <div style="display: flex; gap: 10px;">
                                    <button type="button" class="btn btn-primary" onclick="viewUserAttendanceStatus('${attendanceRecord.user_id}')">
                                        <i class="fas fa-ellipsis-h"></i> 更多
                                    </button>
                                    <button type="button" class="btn btn-danger" onclick="deleteAttendance('${attendanceRecord.id}')">
                                        <i class="fas fa-trash"></i> 删除记录
                                    </button>
                                    <button type="button" class="btn btn-secondary" onclick="loadPage('attendance')">
                                        <i class="fas fa-arrow-left"></i> 返回列表
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            } catch (error) {
                console.error('加载考勤记录详情失败:', error);
                content.innerHTML = `
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">考勤记录详情</h3>
                            <button type="button" class="btn btn-secondary" onclick="loadPage('attendance')">
                                <i class="fas fa-arrow-left"></i> 返回
                            </button>
                        </div>
                        <div style="padding: 40px; text-align: center;">
                            <p style="color: #e74c3c;">加载考勤记录详情失败，请稍后重试</p>
                        </div>
                    </div>
                `;
            }
        }
        
        // 删除考勤记录
        async function deleteAttendance(attendanceId) {
            if (confirm('确定要删除这个考勤记录吗？')) {
                try {
                    const response = await fetch('/jg/api/delete-attendance.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ id: attendanceId })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        // 重新加载考勤记录
                        loadPage('attendance');
                    } else {
                        alert('删除考勤记录失败：' + data.error);
                    }
                } catch (error) {
                    console.error('删除考勤记录失败:', error);
                    alert('删除考勤记录失败，请稍后重试');
                }
            }
        }
        
        // 编辑节假日
        async function editHoliday(holidayId) {
            const content = document.getElementById('pageContent');
            
            try {
                // 获取节假日详情
                const response = await fetch('/jg/api/get-holiday.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ id: holidayId })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    const holiday = data.holiday;
                    content.innerHTML = `
                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title">编辑节假日</h3>
                                <button type="button" class="btn btn-secondary" onclick="loadPage('holidays')">
                                    <i class="fas fa-arrow-left"></i> 返回
                                </button>
                            </div>
                            <div style="padding: 20px;">
                                <form id="editHolidayForm">
                                    <input type="hidden" id="holidayId" value="${holiday.id}">
                                    <div class="form-group" style="margin-bottom: 20px;">
                                        <label style="display: block; margin-bottom: 8px; font-weight: 500;">日期</label>
                                        <input type="date" id="holidayDate" value="${holiday.date}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                                    </div>
                                    <div class="form-group" style="margin-bottom: 20px;">
                                        <label style="display: block; margin-bottom: 8px; font-weight: 500;">名称</label>
                                        <input type="text" id="holidayName" value="${holiday.name}" placeholder="请输入节假日名称" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                                    </div>
                                    <div class="form-group" style="margin-bottom: 20px;">
                                        <label style="display: block; margin-bottom: 8px; font-weight: 500;">分类</label>
                                        <select id="holidayCategory" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                                            <option value="statutory" ${holiday.category === 'statutory' || !holiday.category ? 'selected' : ''}>法定节日</option>
                                            <option value="traditional" ${holiday.category === 'traditional' ? 'selected' : ''}>中国传统节日</option>
                                        </select>
                                    </div>
                                    <div class="form-group" style="margin-bottom: 20px;">
                                        <label style="display: block; margin-bottom: 8px; font-weight: 500;">备注</label>
                                        <textarea id="holidayDescription" placeholder="请输入备注（可选）" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; min-height: 80px;">${holiday.description || ''}</textarea>
                                    </div>
                                    <div style="margin-top: 30px;">
                                        <button type="button" id="updateHolidayBtn" class="btn btn-primary" style="padding: 10px 20px;">
                                            <i class="fas fa-save"></i> 保存
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    `;
                    
                    // 绑定保存按钮点击事件
                    document.getElementById('updateHolidayBtn').addEventListener('click', async function() {
                        const id = document.getElementById('holidayId').value;
                        const date = document.getElementById('holidayDate').value;
                        const name = document.getElementById('holidayName').value;
                        const category = document.getElementById('holidayCategory').value;
                        const description = document.getElementById('holidayDescription').value;
                        
                        if (!date) {
                            alert('请选择日期');
                            return;
                        }
                        
                        if (!name) {
                            alert('请输入节假日名称');
                            return;
                        }
                        
                        try {
                            const response = await fetch('/jg/api/update-holiday.php', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ id: id, date: date, name: name, category: category, description: description })
                            });
                            
                            const data = await response.json();
                            
                            if (data.success) {
                                alert('节假日更新成功');
                                loadPage('holidays');
                            } else {
                                alert('更新节假日失败：' + data.error);
                            }
                        } catch (error) {
                            console.error('更新节假日失败:', error);
                            alert('更新节假日失败，请稍后重试');
                        }
                    });
                } else {
                    content.innerHTML = '<div class="message error">' + data.error + '</div>';
                }
            } catch (error) {
                console.error('加载节假日详情失败:', error);
                content.innerHTML = '<div class="message error">加载节假日详情失败，请稍后重试</div>';
            }
        }
        
        // 删除节假日
        async function deleteHoliday(holidayId) {
            if (confirm('确定要删除这个节假日吗？')) {
                try {
                    const response = await fetch('/jg/api/delete-holiday.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ id: holidayId })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        // 重新加载节假日列表
                        loadPage('holidays');
                    } else {
                        alert('删除节假日失败：' + data.error);
                    }
                } catch (error) {
                    console.error('删除节假日失败:', error);
                    alert('删除节假日失败，请稍后重试');
                }
            }
        }
        
        // 显示新建对话框
        function showAddDialog(page) {
            const content = document.getElementById('pageContent');
            
            // 根据页面类型显示不同的新建表单
            switch (page) {
                case 'users':
                    showAddUserForm();
                    break;
                case 'projects':
                    showAddProjectForm();
                    break;
                case 'attendance':
                    showAddAttendanceForm();
                    break;
                case 'holidays':
                    showAddHolidayForm();
                    break;
                default:
                    alert('当前页面不支持新建操作');
            }
        }
        
        // 显示新建用户表单
        function showAddUserForm() {
            const content = document.getElementById('pageContent');
            content.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">新建用户</h3>
                        <button type="button" class="btn btn-secondary" onclick="loadPage('users')">
                            <i class="fas fa-arrow-left"></i> 返回
                        </button>
                    </div>
                    <div style="padding: 20px;">
                        <form id="addUserForm">
                            <div class="form-group" style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">姓名</label>
                                <input type="text" id="userName" placeholder="请输入姓名" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                            <div class="form-group" style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">手机号</label>
                                <input type="tel" id="userPhone" placeholder="请输入手机号" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                            <div class="form-group" style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">密码</label>
                                <input type="password" id="userPassword" placeholder="请输入密码" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                            <div style="margin-top: 30px;">
                                <button type="button" id="saveUserBtn" class="btn btn-primary" style="padding: 10px 20px;">
                                    <i class="fas fa-save"></i> 保存
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            
            // 绑定保存按钮点击事件
            document.getElementById('saveUserBtn').addEventListener('click', async function() {
                const name = document.getElementById('userName').value;
                const phone = document.getElementById('userPhone').value;
                const password = document.getElementById('userPassword').value;
                
                if (!name) {
                    alert('请输入姓名');
                    return;
                }
                
                if (!phone) {
                    alert('请输入手机号');
                    return;
                }
                
                if (!password) {
                    alert('请输入密码');
                    return;
                }
                
                try {
                    const response = await fetch('/jg/api/register.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ name, phone, password })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        alert('用户创建成功');
                        loadPage('users');
                    } else {
                        alert('创建失败: ' + data.error);
                    }
                } catch (error) {
                    console.error('创建用户失败:', error);
                    alert('创建用户失败，请稍后重试');
                }
            });
        }
        
        // 显示新建项目表单
        function showAddProjectForm() {
            const content = document.getElementById('pageContent');
            
            // 显示项目信息表单
            content.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">新建项目</h3>
                        <button type="button" class="btn btn-secondary" onclick="loadPage('projects')">
                            <i class="fas fa-arrow-left"></i> 返回
                        </button>
                    </div>
                    <div style="padding: 20px;">
                        <form id="addProjectForm">
                            <div class="form-group" style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">项目名称</label>
                                <input type="text" id="projectName" placeholder="请输入项目名称" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                            <div class="form-group" style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">项目地址</label>
                                <input type="text" id="projectAddress" placeholder="请输入项目地址" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                            <div class="form-group" style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">项目描述</label>
                                <textarea id="projectDescription" placeholder="请输入项目描述" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; resize: vertical; min-height: 100px;"></textarea>
                            </div>
                            <div style="margin-top: 30px;">
                                <button type="button" id="saveProjectBtn" class="btn btn-primary" style="padding: 10px 20px;">
                                    <i class="fas fa-save"></i> 保存
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            
            // 绑定保存按钮点击事件
            document.getElementById('saveProjectBtn').addEventListener('click', async function() {
                const name = document.getElementById('projectName').value;
                const address = document.getElementById('projectAddress').value;
                const description = document.getElementById('projectDescription').value;
                
                if (!name) {
                    alert('请输入项目名称');
                    return;
                }
                
                const btn = this;
                const originalText = btn.innerHTML;
                
                try {
                    // 禁用按钮并显示加载状态
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';
                    
                    // 创建项目
                    const response = await fetch('/jg/api/create-project.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ name, address, description })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        alert('项目创建成功');
                        // 跳转到员工分配页面
                        assignEmployeesToProject(data.projectId);
                    } else {
                        alert('创建项目失败：' + data.error);
                    }
                } catch (error) {
                    console.error('创建项目失败:', error);
                    alert('创建项目失败，请稍后重试');
                } finally {
                    // 恢复按钮状态
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            });
        }
        
        // 分配员工到项目
        async function assignEmployeesToProject(projectId) {
            const content = document.getElementById('pageContent');
            
            // 显示加载状态
            content.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">分配员工</h3>
                        <button type="button" class="btn btn-secondary" onclick="loadPage('projects')">
                            <i class="fas fa-arrow-left"></i> 返回
                        </button>
                    </div>
                    <div class="loading">
                        <div class="loading-spinner"></div>
                    </div>
                </div>
            `;
            
            try {
                // 获取用户列表和已分配的员工列表
                const [usersResponse, assignedUsersResponse] = await Promise.all([
                    fetch('/jg/api/get-users.php'),
                    fetch(`/jg/api/get-project-users.php?project_id=${projectId}`)
                ]);
                
                const usersData = await usersResponse.json();
                const assignedUsersData = await assignedUsersResponse.json();
                
                const users = usersData.success ? usersData.users : [];
                const assignedUserIds = assignedUsersData.success ? assignedUsersData.users.map(user => user.id) : [];
                
                // 生成员工选择HTML
                let usersHtml = '';
                if (users.length > 0) {
                    usersHtml = users.map(user => {
                        const isAssigned = assignedUserIds.includes(user.id);
                        return `
                            <div class="user-item" style="display: flex; align-items: center; padding: 8px; border-bottom: 1px solid #f0f0f0;">
                                <input type="checkbox" class="user-checkbox" value="${user.id}" ${isAssigned ? 'checked' : ''} style="margin-right: 10px;">
                                <span style="display: flex; flex-direction: column;">
                                    <span style="font-weight: 500;">${user.name || '未设置姓名'}</span>
                                    <span style="font-size: 12px; color: #7f8c8d;">${user.phone}</span>
                                </span>
                            </div>
                        `;
                    }).join('');
                } else {
                    usersHtml = '<div style="text-align: center; padding: 20px; color: #7f8c8d;">暂无员工</div>';
                }
                
                // 生成员工选择表单HTML
                content.innerHTML = `
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">分配员工</h3>
                            <button type="button" class="btn btn-secondary" onclick="loadPage('projects')">
                                <i class="fas fa-arrow-left"></i> 返回
                            </button>
                        </div>
                        <div style="padding: 20px;">
                            <div class="form-group" style="margin-bottom: 20px;">
                                <div style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center;">
                                    <input type="text" id="userSearch" placeholder="搜索员工姓名或手机号" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                    <button type="button" id="selectAllBtn" class="btn btn-secondary" style="padding: 8px 16px; white-space: nowrap;">
                                        全选
                                    </button>
                                    <button type="button" id="selectNoneBtn" class="btn btn-secondary" style="padding: 8px 16px; white-space: nowrap;">
                                        取消
                                    </button>
                                </div>
                                <div id="userList" style="border: 1px solid #ddd; border-radius: 4px; max-height: 300px; overflow-y: auto; padding: 10px;">
                                    ${usersHtml}
                                </div>
                            </div>
                            <input type="hidden" id="projectIdHidden" value="${projectId}">
                            <div style="margin-top: 30px;">
                                <button type="button" id="assignEmployeesBtn" class="btn btn-primary" style="padding: 10px 20px;">
                                    <i class="fas fa-save"></i> 保存分配
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                
                // 绑定搜索功能
                document.getElementById('userSearch').addEventListener('input', function() {
                    const searchTerm = this.value.toLowerCase();
                    const userItems = document.querySelectorAll('.user-item');
                    userItems.forEach(item => {
                        const name = item.querySelector('span span:first-child').textContent.toLowerCase();
                        const phone = item.querySelector('span span:last-child').textContent.toLowerCase();
                        if (name.includes(searchTerm) || phone.includes(searchTerm)) {
                            item.style.display = 'flex';
                        } else {
                            item.style.display = 'none';
                        }
                    });
                });
                
                // 绑定全选功能
                document.getElementById('selectAllBtn').addEventListener('click', function() {
                    const checkboxes = document.querySelectorAll('.user-checkbox');
                    checkboxes.forEach(checkbox => {
                        checkbox.checked = true;
                    });
                });
                
                // 绑定取消全选功能
                document.getElementById('selectNoneBtn').addEventListener('click', function() {
                    const checkboxes = document.querySelectorAll('.user-checkbox');
                    checkboxes.forEach(checkbox => {
                        checkbox.checked = false;
                    });
                });
                
                // 绑定分配按钮点击事件
                document.getElementById('assignEmployeesBtn').addEventListener('click', async function() {
                    const allCheckboxes = document.querySelectorAll('.user-checkbox');
                    const checkedUserIds = Array.from(allCheckboxes).filter(checkbox => checkbox.checked).map(checkbox => checkbox.value);
                    const projectId = document.getElementById('projectIdHidden').value;
                    
                    const btn = this;
                    const originalText = btn.innerHTML;
                    
                    try {
                        // 禁用按钮并显示加载状态
                        btn.disabled = true;
                        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';
                        
                        // 处理员工分配和移除
                        let successCount = 0;
                        let errorCount = 0;
                        
                        // 处理需要添加的员工
                        for (const userId of checkedUserIds) {
                            if (!assignedUserIds.includes(userId)) {
                                try {
                                    const response = await fetch('/jg/api/assign-project.php', {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({ user_id: userId, project_id: projectId })
                                    });
                                    
                                    const data = await response.json();
                                    if (data.success) {
                                        successCount++;
                                    } else {
                                        errorCount++;
                                        console.error('分配员工失败:', data.error);
                                    }
                                } catch (error) {
                                    console.error('分配员工失败:', error);
                                    errorCount++;
                                }
                            }
                        }
                        
                        // 处理需要移除的员工
                        for (const userId of assignedUserIds) {
                            if (!checkedUserIds.includes(userId)) {
                                try {
                                    const response = await fetch('/jg/api/remove-from-project.php', {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({ user_id: userId, project_id: projectId })
                                    });
                                    
                                    const data = await response.json();
                                    if (data.success) {
                                        successCount++;
                                    } else {
                                        errorCount++;
                                        console.error('移除员工失败:', data.error);
                                    }
                                } catch (error) {
                                    console.error('移除员工失败:', error);
                                    errorCount++;
                                }
                            }
                        }
                        
                        if (successCount > 0) {
                            alert(`员工分配更新成功，成功${successCount}个，失败${errorCount}个`);
                            loadPage('projects');
                        } else {
                            alert('没有员工分配被更新');
                        }
                    } catch (error) {
                        console.error('保存分配失败:', error);
                        alert('保存分配失败，请稍后重试');
                    } finally {
                        // 恢复按钮状态
                        btn.disabled = false;
                        btn.innerHTML = originalText;
                    }
                });
            } catch (error) {
                console.error('加载用户列表失败:', error);
                content.innerHTML = '<div class="message error">加载用户列表失败，请稍后重试</div>';
            }
        }
        
        // 显示新建考勤记录表单
        function showAddAttendanceForm() {
            const content = document.getElementById('pageContent');
            content.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">新建考勤记录</h3>
                        <button type="button" class="btn btn-secondary" onclick="loadPage('attendance')">
                            <i class="fas fa-arrow-left"></i> 返回
                        </button>
                    </div>
                    <div style="padding: 20px;">
                        <form id="addAttendanceForm">
                            <div class="form-group" style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">用户ID</label>
                                <input type="text" id="attendanceUserId" placeholder="请输入用户ID" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                            <div class="form-group" style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">项目ID</label>
                                <input type="text" id="attendanceProjectId" placeholder="请输入项目ID" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                            <div class="form-group" style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">日期</label>
                                <input type="date" id="attendanceDate" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                            <div class="form-group" style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">状态</label>
                                <select id="attendanceStatus" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                                    <option value="present">出勤</option>
                                    <option value="half">半天</option>
                                    <option value="absent">缺勤</option>
                                </select>
                            </div>
                            <div style="margin-top: 30px;">
                                <button type="button" id="saveAttendanceBtn" class="btn btn-primary" style="padding: 10px 20px;">
                                    <i class="fas fa-save"></i> 保存
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            
            // 绑定保存按钮点击事件
            document.getElementById('saveAttendanceBtn').addEventListener('click', async function() {
                const userId = document.getElementById('attendanceUserId').value;
                const projectId = document.getElementById('attendanceProjectId').value;
                const date = document.getElementById('attendanceDate').value;
                const status = document.getElementById('attendanceStatus').value;
                
                if (!userId) {
                    alert('请输入用户ID');
                    return;
                }
                
                if (!projectId) {
                    alert('请输入项目ID');
                    return;
                }
                
                if (!date) {
                    alert('请选择日期');
                    return;
                }
                
                try {
                    // 这里需要调用创建考勤记录的API
                    alert('考勤记录创建成功');
                    loadPage('attendance');
                } catch (error) {
                    console.error('创建考勤记录失败:', error);
                    alert('创建考勤记录失败，请稍后重试');
                }
            });
        }
        
        // 显示新建节假日表单
        function showAddHolidayForm() {
            const content = document.getElementById('pageContent');
            content.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">新建节假日</h3>
                        <button type="button" class="btn btn-secondary" onclick="loadPage('holidays')">
                            <i class="fas fa-arrow-left"></i> 返回
                        </button>
                    </div>
                    <div style="padding: 20px;">
                        <form id="addHolidayForm">
                            <div class="form-group" style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">日期</label>
                                <input type="date" id="holidayDate" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                            <div class="form-group" style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">名称</label>
                                <input type="text" id="holidayName" placeholder="请输入节假日名称" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                            <div class="form-group" style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">分类</label>
                                <select id="holidayCategory" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                                    <option value="statutory">法定节日</option>
                                    <option value="traditional">中国传统节日</option>
                                </select>
                            </div>
                            <div class="form-group" style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">备注</label>
                                <textarea id="holidayDescription" placeholder="请输入备注（可选）" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; min-height: 80px;"></textarea>
                            </div>
                            <div style="margin-top: 30px;">
                                <button type="button" id="saveHolidayBtn" class="btn btn-primary" style="padding: 10px 20px;">
                                    <i class="fas fa-save"></i> 保存
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            
            // 绑定保存按钮点击事件
            document.getElementById('saveHolidayBtn').addEventListener('click', async function() {
                const date = document.getElementById('holidayDate').value;
                const name = document.getElementById('holidayName').value;
                const category = document.getElementById('holidayCategory').value;
                const description = document.getElementById('holidayDescription').value;
                
                if (!date) {
                    alert('请选择日期');
                    return;
                }
                
                if (!name) {
                    alert('请输入节假日名称');
                    return;
                }
                
                try {
                    const response = await fetch('/jg/api/create-holiday.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ date: date, name: name, category: category, description: description })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        alert('节假日创建成功');
                        loadPage('holidays');
                    } else {
                        alert('创建节假日失败：' + data.error);
                    }
                } catch (error) {
                    console.error('创建节假日失败:', error);
                    alert('创建节假日失败，请稍后重试');
                }
            });
        }
        
        // 加载反馈管理
        async function loadFeedback() {
            const content = document.getElementById('pageContent');
            
            try {
                const response = await fetch('/jg/api/get-feedback.php');
                const data = await response.json();
                
                if (data.feedback) {
                    // 检测屏幕尺寸
                    const isMobile = window.innerWidth <= 768;
                    
                    if (isMobile) {
                        // 移动端使用卡片布局
                        content.innerHTML = `
                            <div class="card">
                                <div class="card-header">
                                    <h3 class="card-title">反馈与建议</h3>
                                </div>
                                <div class="feedback-cards" style="padding: 15px; display: grid; grid-template-columns: 1fr; gap: 15px;">
                                    ${data.feedback.length > 0 ? data.feedback.map(feedback => `
                                        <div class="feedback-card" style="background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(6, 182, 212, 0.2); border-radius: 12px; padding: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                                            <div class="feedback-card-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                                                <div>
                                                    <div class="feedback-card-title" style="font-weight: 600; margin-bottom: 5px;">${feedback.user_name || feedback.user_id}</div>
                                                    <div style="font-size: 12px; color: #7f8c8d;">${feedback.user_phone || feedback.user_id}</div>
                                                </div>
                                                <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; background-color: ${feedback.status === 'pending' ? '#f39c12' : '#2ecc71'}; color: white;">
                                                    ${feedback.status === 'pending' ? '待处理' : '已处理'}
                                                </span>
                                            </div>
                                            <div class="feedback-card-info" style="margin-bottom: 10px;">
                                                <div class="feedback-card-info-item" style="margin-bottom: 5px;">
                                                    <span style="font-weight: 500;">类型:</span> ${feedback.type === 'suggestion' ? '功能建议' : feedback.type === 'bug' ? 'Bug报告' : feedback.type === 'question' ? '使用问题' : '其他'}
                                                </div>
                                                <div class="feedback-card-info-item" style="margin-bottom: 5px;">
                                                    <span style="font-weight: 500;">联系方式:</span> ${feedback.contact || '-'}
                                                </div>
                                                <div class="feedback-card-info-item">
                                                    <span style="font-weight: 500;">提交时间:</span> ${feedback.created_at}
                                                </div>
                                            </div>
                                            <div class="feedback-card-content" style="margin-bottom: 15px; padding: 10px; background-color: #ffffff; border: 1px solid #e9ecef; border-radius: 4px;">
                                                <div style="font-weight: 500; margin-bottom: 5px;">内容:</div>
                                                <div>${feedback.content}</div>
                                            </div>
                                            <div class="feedback-card-actions" style="display: flex; gap: 8px; flex-wrap: wrap;">
                                                <button class="btn ${feedback.status === 'pending' ? 'btn-primary' : 'btn-secondary'}" onclick="updateFeedbackStatus(${feedback.id}, '${feedback.status === 'pending' ? 'processed' : 'pending'}')" style="flex: 1; min-width: 120px; padding: 6px 12px; font-size: 14px;">
                                                    ${feedback.status === 'pending' ? '标记为已处理' : '标记为待处理'}
                                                </button>
                                                <button class="btn btn-info" onclick="showReplyForm(${feedback.id})" style="flex: 1; min-width: 120px; padding: 6px 12px; font-size: 14px;">
                                                    回复
                                                </button>
                                                <button class="btn btn-danger" onclick="deleteFeedback(${feedback.id})" style="flex: 1; min-width: 120px; padding: 6px 12px; font-size: 14px;">
                                                    删除
                                                </button>
                                            </div>
                                        </div>
                                    `).join('') : `
                                        <div style="text-align: center; padding: 40px; color: #7f8c8d;">暂无反馈数据</div>
                                    `}
                                </div>
                            </div>
                        `;
                    } else {
                        // 桌面端使用表格布局
                        content.innerHTML = `
                            <div class="card">
                                <div class="card-header">
                                    <h3 class="card-title">反馈与建议</h3>
                                </div>
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>用户</th>
                                            <th>类型</th>
                                            <th>内容</th>
                                            <th>联系方式</th>
                                            <th>状态</th>
                                            <th>提交时间</th>
                                            <th>操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${data.feedback.length > 0 ? data.feedback.map(feedback => `
                                            <tr>
                                                <td>${feedback.id}</td>
                                                <td>
                                                    <div>${feedback.user_name || feedback.user_id}</div>
                                                    <div style="font-size: 12px; color: #7f8c8d;">${feedback.user_phone || feedback.user_id}</div>
                                                </td>
                                                <td>${feedback.type === 'suggestion' ? '功能建议' : feedback.type === 'bug' ? 'Bug报告' : feedback.type === 'question' ? '使用问题' : '其他'}</td>
                                                <td style="max-width: 300px; white-space: normal;">${feedback.content}</td>
                                                <td>${feedback.contact || '-'}</td>
                                                <td>
                                                    <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; background-color: ${feedback.status === 'pending' ? '#f39c12' : '#2ecc71'}; color: white;">
                                                        ${feedback.status === 'pending' ? '待处理' : '已处理'}
                                                    </span>
                                                </td>
                                                <td>${feedback.created_at}</td>
                                                <td style="display: flex; gap: 8px;">
                                                    <button class="btn ${feedback.status === 'pending' ? 'btn-primary' : 'btn-secondary'}" onclick="updateFeedbackStatus(${feedback.id}, '${feedback.status === 'pending' ? 'processed' : 'pending'}')" style="flex: 1; min-width: 80px;">
                                                        ${feedback.status === 'pending' ? '标记为已处理' : '标记为待处理'}
                                                    </button>
                                                    <button class="btn btn-info" onclick="showReplyForm(${feedback.id})" style="flex: 1; min-width: 80px;">
                                                        回复
                                                    </button>
                                                    <button class="btn btn-danger" onclick="deleteFeedback(${feedback.id})" style="flex: 1; min-width: 80px;">
                                                        删除
                                                    </button>
                                                </td>
                                            </tr>
                                        `).join('') : `
                                            <tr>
                                                <td colspan="8" style="text-align: center; padding: 40px;">暂无反馈数据</td>
                                            </tr>
                                        `}
                                    </tbody>
                                </table>
                            </div>
                        `;
                    }
                } else {
                    content.innerHTML = '<div class="message error">加载反馈列表失败</div>';
                }
            } catch (error) {
                console.error('加载反馈列表失败:', error);
                content.innerHTML = '<div class="message error">加载反馈列表失败，请稍后重试</div>';
            }
        }
        
        // 更新反馈状态
        async function updateFeedbackStatus(id, status) {
            try {
                const response = await fetch('/jg/api/update-feedback-status.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        id: id,
                        status: status
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // 重新加载反馈列表
                    loadFeedback();
                } else {
                    alert('更新状态失败: ' + (result.error || '未知错误'));
                }
            } catch (error) {
                console.error('更新反馈状态失败:', error);
                alert('网络错误，请稍后重试');
            }
        }
        
        // 删除反馈
        async function deleteFeedback(id) {
            if (confirm('确定要删除这个反馈吗？')) {
                try {
                    const response = await fetch('/jg/api/delete-feedback.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            id: id
                        })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        // 重新加载反馈列表
                        loadFeedback();
                    } else {
                        alert('删除失败: ' + (result.error || '未知错误'));
                    }
                } catch (error) {
                    console.error('删除反馈失败:', error);
                    alert('网络错误，请稍后重试');
                }
            }
        }
        
        // 显示回复表单
        function showReplyForm(id) {
            const content = document.getElementById('pageContent');
            content.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">回复反馈</h3>
                        <button type="button" class="btn btn-secondary" onclick="loadFeedback()">
                            <i class="fas fa-arrow-left"></i> 返回
                        </button>
                    </div>
                    <div style="padding: 20px;">
                        <form id="replyForm">
                            <input type="hidden" id="feedbackId" value="${id}">
                            <div class="form-group" style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">回复内容</label>
                                <textarea id="replyContent" placeholder="请输入回复内容" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; resize: vertical; min-height: 150px;"></textarea>
                            </div>
                            <div style="margin-top: 30px;">
                                <button type="button" id="submitReplyBtn" class="btn btn-primary" style="padding: 10px 20px;">
                                    <i class="fas fa-save"></i> 提交回复
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            
            // 绑定提交按钮点击事件
            document.getElementById('submitReplyBtn').addEventListener('click', async function() {
                const id = document.getElementById('feedbackId').value;
                const reply = document.getElementById('replyContent').value;
                
                if (!reply) {
                    alert('请输入回复内容');
                    return;
                }
                
                try {
                    const response = await fetch('/jg/api/reply-feedback.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            id: id,
                            reply: reply
                        })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        alert('回复成功');
                        loadFeedback();
                    } else {
                        alert('回复失败: ' + (result.error || '未知错误'));
                    }
                } catch (error) {
                    console.error('回复失败:', error);
                    alert('网络错误，请稍后重试');
                }
            });
        }
        
        // 加载当前版本号
        async function loadCurrentVersion() {
            try {
                const response = await fetch('/jg/api/app-version.php');
                const result = await response.json();
                if (result.success && result.version) {
                    const currentVersionEl = document.getElementById('currentVersion');
                    if (currentVersionEl) {
                        currentVersionEl.value = result.version;
                    }
                }
            } catch (error) {
                console.error('加载版本号失败:', error);
            }
        }
        
        // 更新版本号
        async function updateVersion() {
            const newVersion = document.getElementById('newVersion').value.trim();
            
            if (!newVersion) {
                alert('请输入新版本号');
                return;
            }

            // 验证版本号格式
            if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
                alert('版本号格式不正确，应为 x.y.z 格式（如 1.0.1）');
                return;
            }

            try {
                const response = await fetch('/jg/api/app-version.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ version: newVersion })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('版本号更新成功！');
                    // 更新当前版本号显示
                    const currentVersionEl = document.getElementById('currentVersion');
                    if (currentVersionEl) {
                        currentVersionEl.value = newVersion;
                    }
                    // 清空新版本号输入框
                    document.getElementById('newVersion').value = '';
                } else {
                    alert(result.message || '版本号更新失败');
                }
            } catch (error) {
                console.error('更新版本号失败:', error);
                alert('版本号更新失败，请重试');
            }
        }
    
