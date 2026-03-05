<?php
// 登录页面
$pageTitle = '考勤管理系统 - 登录';

// 包含数据库连接文件，用于CSRF令牌生成
include '../includes/db.php';

// 启动会话
session_start();
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $pageTitle; ?></title>
    <link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link rel="stylesheet" href="/jg/css-new/variables.css">
    <link rel="stylesheet" href="/jg/css-new/base.css">
    <link rel="stylesheet" href="/jg/css-new/components.css">
    <link rel="stylesheet" href="/jg/css-new/layout.css">
    <link rel="stylesheet" href="/jg/css-new/form.css">
    
    <!-- 预加载主页所需的静态资源 -->
    <link rel="preload" href="/jg/css-new/bundle.min.css" as="style" crossorigin="anonymous">
    <link rel="preload" href="/jg/icon.svg" as="image" crossorigin="anonymous">
    <link rel="preload" href="//cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" as="style" crossorigin="anonymous">
    <script src="/jg/js/system-settings.js"></script>
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
        
        // 页面加载完成后执行
        document.addEventListener('DOMContentLoaded', async function() {
            try {
                await loadSystemName({
                    elements: [
                        {
                            selector: '.login-brand-title',
                            type: 'text'
                        },
                        {
                            selector: '.login-footer p',
                            type: 'text'
                        }
                    ]
                });
                
                // 检查"允许记住密码"设置
                const savedSettings = localStorage.getItem('systemSettings');
                if (savedSettings) {
                    const settings = JSON.parse(savedSettings);
                    if (settings.allowRememberPassword === false) {
                        // 如果不允许记住密码，隐藏"记住我"选项
                        const rememberCheckbox = document.querySelector('.form-checkbox');
                        if (rememberCheckbox) {
                            rememberCheckbox.style.display = 'none';
                        }
                    }
                }
            } catch (error) {
                console.error('执行loadSystemName函数时出错:', error);
            }
        });
    </script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        html, body {
            overflow: auto;
            scrollbar-width: none;
            -ms-overflow-style: none;
        }
        
        html::-webkit-scrollbar,
        body::-webkit-scrollbar {
            display: none;
        }
        
        .login-container {
            min-height: 100vh;
            display: flex;
            position: relative;
            background: linear-gradient(135deg, #1696ff 0%, #0066cc 50%, #004799 100%);
        }
        
        
        .login-bg-left {
            position: absolute;
            left: 0;
            top: 0;
            width: 50%;
            height: 100%;
            background: transparent;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 1;
            padding: 40px;
            color: white;
            overflow: hidden;
        }
        
        .login-bg-left::before {
            content: '';
            position: absolute;
            bottom: 60px;
            left: 50%;
            transform: translateX(-50%);
            width: 300px;
            height: 300px;
            background: url('/jg/img/login.webp') center center / contain no-repeat;
            opacity: 0.2;
            z-index: 0;
        }
        
        .login-brand {
            position: relative;
            z-index: 1;
            text-align: center;
        }
        
        .login-brand-logo {
            font-size: 60px;
            margin-bottom: 20px;
        }
        
        .login-brand-title {
            font-size: 36px;
            font-weight: 700;
            margin-bottom: 12px;
            text-shadow: 0 2px 10px rgba(0,0,0,0.2);
        }
        
        .login-brand-desc {
            font-size: 16px;
            opacity: 0.9;
            max-width: 400px;
            line-height: 1.5;
        }
        
        .login-brand-features {
            margin-top: 30px;
            display: flex;
            gap: 30px;
        }
        
        .login-brand-feature {
            text-align: center;
        }
        
        .login-brand-feature i {
            font-size: 32px;
            margin-bottom: 12px;
            display: block;
        }
        
        .login-brand-feature span {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .login-right {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
            background: transparent;
            overflow: hidden;
            position: relative;
            z-index: 1;
        }
        
        .login-card {
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 
                        inset 0 1px 0 rgba(255, 255, 255, 0.6);
            padding: 50px;
            width: 100%;
            max-width: 440px;
            z-index: 2;
            position: relative;
            min-height: 520px;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .login-header {
            text-align: center;
            margin-bottom: 35px;
        }
        
        .login-logo {
            width: 70px;
            height: 70px;
            background: linear-gradient(135deg, #165DFF 0%, #0EA5E9 100%);
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            box-shadow: 0 10px 30px rgba(22, 93, 255, 0.3);
        }
        
        .login-logo i {
            font-size: 32px;
            color: white;
        }
        
        .login-title {
            font-size: 28px;
            font-weight: 700;
            color: #1a1a2e;
            margin-bottom: 8px;
        }
        
        .login-logo-link {
            display: inline-block;
            color: inherit;
            text-decoration: none;
        }
        
        .login-subtitle {
            font-size: 15px;
            color: #6b7280;
        }
        
        .auth-tabs {
            display: flex;
            margin-bottom: 30px;
            background: #f3f4f6;
            border-radius: 12px;
            padding: 4px;
            position: relative;
        }
        
        .auth-tab-slider {
            position: absolute;
            top: 4px;
            left: 4px;
            width: calc(50% - 4px);
            height: calc(100% - 8px);
            background: #165DFF;
            border-radius: 10px;
            transition: transform 0.25s ease;
            z-index: 0;
        }
        
        .auth-tab-slider.register {
            transform: translateX(100%);
        }
        
        .auth-tab {
            flex: 1;
            padding: 12px;
            text-align: center;
            cursor: pointer;
            font-size: 15px;
            font-weight: 600;
            color: #6b7280;
            transition: color 0.3s ease;
            border-radius: 10px;
            position: relative;
            z-index: 1;
        }
        
        .auth-tab.active {
            color: white;
        }
        
        .auth-form {
            opacity: 0;
            visibility: hidden;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            transition: opacity 0.3s ease, visibility 0.3s ease;
        }
        
        .auth-form.active {
            opacity: 1;
            visibility: visible;
            position: relative;
            animation: formFadeInUp 0.4s ease forwards !important;
        }
        
        @keyframes formFadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        /* 确保动画不被禁用 */
        .login-card .auth-form.active {
            animation: formFadeInUp 0.5s ease forwards !important;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideInRight {
            from { opacity: 0; transform: translateX(30px); }
            to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes slideInLeft {
            from { opacity: 0; transform: translateX(-30px); }
            to { opacity: 1; transform: translateX(0); }
        }
        
        .btn-secondary {
            width: 100%;
            padding: 14px;
            background-color: white;
            color: #165DFF;
            border: 2px solid #165DFF;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 12px;
        }
        
        .btn-secondary:hover {
            background-color: #f0f7ff;
            transform: translateY(-2px);
        }
        
        .form-group {
            margin-bottom: 22px;
        }
        
        .form-label {
            display: block;
            margin-bottom: 10px;
            font-size: 14px;
            font-weight: 600;
            color: #374151;
        }
        
        .form-input {
            width: 100%;
            padding: 14px 18px;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            font-size: 15px;
            transition: all 0.3s ease;
            background: #f9fafb;
        }
        
        .form-input:focus {
            outline: none;
            border-color: #165DFF;
            background: white;
            box-shadow: 0 0 0 4px rgba(22, 93, 255, 0.1);
        }
        
        .form-input::placeholder {
            color: #9ca3af;
        }
        
        .form-checkbox {
            display: flex;
            align-items: center;
            margin-bottom: 22px;
        }
        
        .form-checkbox input {
            width: 18px;
            height: 18px;
            margin-right: 10px;
            accent-color: #165DFF;
        }
        
        .form-checkbox label {
            font-size: 14px;
            color: #6b7280;
            cursor: pointer;
        }
        
        .btn-primary {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #165DFF 0%, #0EA5E9 100%);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 17px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(22, 93, 255, 0.3);
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(22, 93, 255, 0.4);
        }
        
        .btn-primary:active {
            transform: translateY(0);
        }
        
        .login-footer {
            text-align: center;
            margin-top: 30px;
            font-size: 14px;
            color: #9ca3af;
        }
        
        .login-footer a {
            color: #165DFF;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.3s ease;
        }
        
        .login-footer a:hover {
            color: #0EA5E9;
        }
        
        .error-message {
            padding: 14px 18px;
            border-radius: 12px;
            margin-bottom: 22px;
            font-size: 14px;
            opacity: 0;
            visibility: hidden;
            height: 0;
            padding: 0;
            margin: 0;
            overflow: hidden;
            transition: opacity 0.3s ease, height 0.3s ease, padding 0.3s ease, margin 0.3s ease;
        }
        
        .error-message.show {
            opacity: 1;
            visibility: visible;
            height: auto;
            padding: 14px 18px;
            margin-bottom: 22px;
            animation: shake 0.5s ease;
        }
        
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
        
        .error-message.error {
            background-color: #fef2f2;
            color: #dc2626;
            border: 1px solid #fecaca;
        }
        
        .error-message.success {
            background-color: #f0fdf4;
            color: #16a34a;
            border: 1px solid #bbf7d0;
        }
        
        .error-message.warning {
            background-color: #fffbeb;
            color: #d97706;
            border: 1px solid #fde68a;
        }
        
        .forgot-link {
            text-align: right;
            margin-bottom: 22px;
        }
        
        .forgot-link a {
            font-size: 14px;
            color: #165DFF;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.3s ease;
        }
        
        .forgot-link a:hover {
            color: #0EA5E9;
        }
        
        @media (max-width: 1024px) {
            .login-bg-left {
                display: none;
            }
            
            .login-right {
                width: 100%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
        }
        
        @media (max-width: 768px) {
            .login-right {
                padding: 20px;
            }
            
            .login-card {
                padding: 35px 25px;
            }
            
            .login-title {
                font-size: 24px;
            }
            
            .login-brand-title {
                font-size: 32px;
            }
        }
    </style>
</head>
<body>
    <div class="login-container">
        <!-- 左侧品牌展示区域 -->
        <div class="login-bg-left">
            <div class="login-brand">
                <div class="login-brand-logo">
                    <i class="fas fa-hard-hat"></i>
                </div>
                <h1 class="login-brand-title">任工记工</h1>
                <p class="login-brand-desc">智能考勤管理系统，让工作更高效，让管理更轻松</p>
                <div class="login-brand-features">
                    <div class="login-brand-feature">
                        <i class="fas fa-clock"></i>
                        <span>智能考勤</span>
                    </div>
                    <div class="login-brand-feature">
                        <i class="fas fa-chart-line"></i>
                        <span>数据分析</span>
                    </div>
                    <div class="login-brand-feature">
                        <i class="fas fa-mobile-alt"></i>
                        <span>移动办公</span>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- 右侧登录区域 -->
        <div class="login-right">
            <div class="login-card">
                <div class="login-header">
                    <div class="login-logo">
                        <i class="fas fa-hard-hat"></i>
                    </div>
                    <h1 class="login-title">欢迎回来</h1>
                    <p class="login-subtitle">请登录或注册以继续</p>
                </div>
                
                <div id="error-message" class="error-message"></div>
                
                <!-- 标签页切换 -->
                <div class="auth-tabs">
                    <div class="auth-tab-slider" id="authTabSlider"></div>
                    <div class="auth-tab active" data-tab="login">登录</div>
                    <div class="auth-tab" data-tab="register">注册</div>
                </div>
            
            <!-- 登录表单 -->
            <form id="login-form" class="auth-form active">
                <div class="form-group">
                    <label class="form-label" for="login-username">手机号</label>
                    <input type="text" class="form-input" id="login-username" name="username" placeholder="请输入手机号" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label" for="login-password">密码</label>
                    <input type="password" class="form-input" id="login-password" name="password" placeholder="请输入密码" required autocomplete="current-password">
                </div>
                
                <div class="form-checkbox">
                    <input type="checkbox" id="remember" name="remember">
                    <label for="remember">记住我</label>
                </div>
                
                <div class="forgot-link">
                    <a href="#" id="forgot-password-link">忘记密码？</a>
                </div>
                
                <button type="submit" class="btn-primary">登录</button>
            </form>
            
            <!-- 注册表单 -->
            <form id="register-form" class="auth-form">
                <div class="form-group">
                    <label class="form-label" for="register-name">姓名</label>
                    <input type="text" class="form-input" id="register-name" name="name" placeholder="请输入姓名" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label" for="register-username">手机号</label>
                    <input type="text" class="form-input" id="register-username" name="username" placeholder="请输入手机号" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label" for="register-password">密码</label>
                    <input type="password" class="form-input" id="register-password" name="password" placeholder="请输入密码" required autocomplete="new-password">
                </div>
                
                <div class="form-group">
                    <label class="form-label" for="register-confirm-password">确认密码</label>
                    <input type="password" class="form-input" id="register-confirm-password" name="confirm-password" placeholder="请再次输入密码" required autocomplete="new-password">
                </div>
                
                <button type="submit" class="btn-primary">注册</button>
                <button type="button" class="btn-secondary" id="switch-to-login">已有账号？去登录</button>
            </form>
            
            <!-- 忘记密码表单 -->
            <form id="forgot-password-form" class="auth-form">
                <div class="form-group">
                    <label class="form-label" for="forgot-username">手机号</label>
                    <input type="text" class="form-input" id="forgot-username" name="username" placeholder="请输入手机号" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label" for="forgot-code">验证码</label>
                    <div style="display: flex; gap: 10px;">
                        <input type="text" class="form-input" id="forgot-code" name="code" placeholder="请输入验证码" required style="flex: 1;">
                        <button type="button" class="btn-secondary" id="send-code-btn" style="flex: 0 0 120px; padding: 0;">发送验证码</button>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label" for="forgot-new-password">新密码</label>
                    <input type="password" class="form-input" id="forgot-new-password" name="new-password" placeholder="请输入新密码" required autocomplete="new-password">
                </div>
                
                <div class="form-group">
                    <label class="form-label" for="forgot-confirm-password">确认新密码</label>
                    <input type="password" class="form-input" id="forgot-confirm-password" name="confirm-password" placeholder="请再次输入新密码" required autocomplete="new-password">
                </div>
                
                <button type="submit" class="btn-primary">重置密码</button>
                <button type="button" class="btn-secondary" id="switch-to-login-from-forgot">返回登录</button>
            </form>
            
            <div class="login-footer">
                <p>© 2026 任工记工</p>
            </div>
            </div>
        </div>
    </div>
    
    <script>
        // 标签页切换功能
        document.addEventListener('DOMContentLoaded', function() {
            // 标签页切换
            const tabs = document.querySelectorAll('.auth-tab');
            const forms = document.querySelectorAll('.auth-form');
            const loginCard = document.querySelector('.login-card');
            const authTabs = document.querySelector('.auth-tabs');
            const slider = document.getElementById('authTabSlider');
            
            tabs.forEach(tab => {
                tab.addEventListener('click', function() {
                    const tabId = this.dataset.tab;
                    
                    // 更新标签页状态
                    tabs.forEach(t => t.classList.remove('active'));
                    this.classList.add('active');
                    
                    // 更新滑块位置（点击固定）
                    if (tabId === 'register') {
                        slider.classList.add('register');
                    } else {
                        slider.classList.remove('register');
                    }
                    
                    // 切换表单显示
                    forms.forEach(form => {
                        form.classList.remove('active');
                    });
                    
                    // 显示新表单
                    const targetForm = document.getElementById(`${tabId}-form`);
                    targetForm.classList.add('active');
                    
                    // 清空错误消息
                    document.getElementById('error-message').classList.remove('show');
                });
            });
            
            // 手机号自动填充功能
            const phoneInput = document.getElementById('register-username');
            const nameInput = document.getElementById('register-name');
            
            if (phoneInput && nameInput) {
                phoneInput.addEventListener('input', function() {
                    // 当用户输入手机号时，自动填充到姓名字段
                    if (this.value) {
                        nameInput.value = this.value;
                    }
                });
            }
            
            // 切换到登录按钮
            document.getElementById('switch-to-login').addEventListener('click', function() {
                tabs.forEach(tab => {
                    if (tab.dataset.tab === 'login') {
                        tab.click();
                    }
                });
            });
            
            // 忘记密码链接点击事件
            document.getElementById('forgot-password-link').addEventListener('click', function(e) {
                e.preventDefault();
                
                // 隐藏所有表单
                forms.forEach(form => form.classList.remove('active'));
                
                // 显示忘记密码表单
                document.getElementById('forgot-password-form').classList.add('active');
                
                // 清空错误消息
                document.getElementById('error-message').classList.remove('show');
            });
            
            // 从忘记密码表单返回登录
            document.getElementById('switch-to-login-from-forgot').addEventListener('click', function() {
                // 隐藏所有表单
                forms.forEach(form => form.classList.remove('active'));
                
                // 显示登录表单
                document.getElementById('login-form').classList.add('active');
                
                // 更新标签页状态
                tabs.forEach(tab => {
                    tab.classList.remove('active');
                    if (tab.dataset.tab === 'login') {
                        tab.classList.add('active');
                    }
                });
                
                // 更新滑块位置
                slider.classList.remove('register');
                
                // 清空错误消息
                document.getElementById('error-message').classList.remove('show');
            });
        });
        
        // 登录表单处理
        document.getElementById('login-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            const remember = document.getElementById('remember').checked;
            
            // 简单的登录验证
            if (!username || !password) {
                showError('请输入用户名和密码');
                return;
            }
            
            // 验证手机号格式
            const phoneRegex = /^1[3-9]\d{9}$/;
            if (!phoneRegex.test(username)) {
                showError('请输入有效的手机号');
                return;
            }
            
            // 调用后端API进行登录验证
            try {
                const response = await fetch('/jg/api/login.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        phone: username,
                        password: password
                    })
                });
                
                const data = await response.json();
                console.log('登录API响应:', data);
                
                if (data.success) {
                    // 登录成功
                    const userData = data.data && data.data.user ? data.data.user : data.user;
                    console.log('登录成功:', userData);
                    
                    // 存储登录状态 - 使用服务器返回的用户ID
                    const userId = userData.id;
                    const maxAge = remember ? 2592000 : 3600; // 30天或1小时
                    document.cookie = `user_id=${userId}; max-age=${maxAge}; path=/; secure=false; samesite=lax`;
                    
                    // 同时存储到localStorage，作为备份
                localStorage.setItem('user_id', userId);
                localStorage.setItem('login_time', Date.now());
                localStorage.setItem('username', username); // 存储手机号作为显示用
                localStorage.setItem('user_phone', username); // 存储手机号作为备份
                    
                    // 保存个人信息到localStorage
                    const personalInfo = {
                        name: userData.name || username,
                        phone: username
                    };
                    localStorage.setItem('personalInfo', JSON.stringify(personalInfo));
                    
                    // 登录成功，跳转到首页
                    // 数据会根据用户ID从服务器加载，不需要清空
                    console.log('登录状态已保存，正在跳转到首页...');
                    console.log('Cookie:', document.cookie);
                    console.log('LocalStorage user_id:', localStorage.getItem('user_id'));
                    
                    // 登录成功后跳转到首页
                    window.location.href = '/jg/index.php';
                } else {
                    // 登录失败
                    console.error('登录失败:', data.error);
                    showError(data.error || '登录失败，请重试');
                }
            } catch (error) {
                console.error('登录请求失败:', error);
                showError('网络错误，请检查网络连接后重试');
            }
        });
        
        // 注册表单处理
        document.getElementById('register-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('register-name').value;
            const username = document.getElementById('register-username').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm-password').value;
            
            // 简单的注册验证
            if (!name || !username || !password || !confirmPassword) {
                showError('请填写所有必填字段');
                return;
            }
            
            // 验证手机号格式
            const phoneRegex = /^1[3-9]\d{9}$/;
            if (!phoneRegex.test(username)) {
                showError('请输入有效的手机号');
                return;
            }
            
            if (password !== confirmPassword) {
                showError('两次输入的密码不一致');
                return;
            }
            
            if (password.length < 6) {
                showError('密码长度至少为6位');
                return;
            }
            
            // 调用后端API进行注册验证
            let data;
            try {
                console.log('开始注册请求:', { name: name, phone: username, password: password });
                const response = await fetch('/jg/api/register.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: name,
                        phone: username,
                        password: password
                    })
                });
                
                console.log('注册请求响应状态:', response.status);
                console.log('注册请求响应状态文本:', response.statusText);
                
                data = await response.json();
                console.log('注册API响应:', data);
                
                if (!data.success) {
                    console.error('注册失败:', data.error);
                    showError(data.error || '注册失败，请重试');
                    return;
                }
                
                const userData = data.data && data.data.user ? data.data.user : data.user;
                console.log('注册成功:', userData);
                showMessage('注册成功，正在自动登录...', 'success');
            } catch (error) {
                console.error('注册请求失败:', error);
                showError('网络错误，请检查网络连接后重试');
                return;
            }
            
            // 注册成功后自动登录
            // 使用服务器返回的用户ID
            const userData = data.data && data.data.user ? data.data.user : data.user;
            const userId = userData.id;
            document.cookie = `user_id=${userId}; max-age=2592000; path=/; secure=false; samesite=lax`;
            
            // 同时存储到localStorage，作为备份
            localStorage.setItem('user_id', userId);
            localStorage.setItem('login_time', Date.now());
            localStorage.setItem('username', username); // 存储手机号作为显示用
            localStorage.setItem('user_phone', username); // 存储手机号作为备份
            
            // 保存个人信息到localStorage
            const personalInfo = {
                name: name,
                phone: username
            };
            localStorage.setItem('personalInfo', JSON.stringify(personalInfo));
            
            // 注册成功，跳转到首页
            // 数据会根据用户ID从服务器加载，不需要清空
            console.log('注册成功，自动登录中...');
            console.log('Cookie:', document.cookie);
            console.log('LocalStorage user_id:', localStorage.getItem('user_id'));
            
            // 注册成功后跳转到首页
            window.location.href = '/jg/index.php';
        });
        
        // 显示错误消息
        function showError(message) {
            const errorDiv = document.getElementById('error-message');
            errorDiv.textContent = message;
            errorDiv.className = 'error-message show error';
            
            // 3秒后自动隐藏错误消息
            setTimeout(() => {
                errorDiv.classList.remove('show');
            }, 3000);
        }
        
        // 显示消息
        function showMessage(message, type = 'success') {
            const errorDiv = document.getElementById('error-message');
            errorDiv.textContent = message;
            errorDiv.className = `error-message show ${type}`;
            
            // 3秒后自动隐藏消息
            setTimeout(() => {
                errorDiv.classList.remove('show');
            }, 3000);
        }
        
        // 预加载核心脚本，为后续页面做好准备
        function preloadScript(src) {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            document.head.appendChild(script);
        }
        
        // 发送验证码功能
        let countdown = 0;
        let countdownTimer = null;
        
        document.getElementById('send-code-btn').addEventListener('click', async function() {
            const phone = document.getElementById('forgot-username').value;
            
            // 验证手机号格式
            const phoneRegex = /^1[3-9]\d{9}$/;
            if (!phoneRegex.test(phone)) {
                showError('请输入有效的手机号');
                return;
            }
            
            // 检查是否正在倒计时
            if (countdown > 0) {
                return;
            }
            
            try {
                // 调用后端API发送验证码
                const response = await fetch('/jg/api/send-code.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ phone: phone })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showMessage('验证码已发送，请注意查收', 'success');
                    
                    // 开始倒计时
                    countdown = 60;
                    const btn = document.getElementById('send-code-btn');
                    btn.disabled = true;
                    
                    countdownTimer = setInterval(() => {
                        countdown--;
                        btn.textContent = `${countdown}秒后重发`;
                        
                        if (countdown <= 0) {
                            clearInterval(countdownTimer);
                            btn.textContent = '发送验证码';
                            btn.disabled = false;
                        }
                    }, 1000);
                } else {
                    showError(data.error || '发送验证码失败，请重试');
                }
            } catch (error) {
                console.error('发送验证码失败:', error);
                showError('网络错误，请检查网络连接后重试');
            }
        });
        
        // 忘记密码表单处理
        document.getElementById('forgot-password-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const phone = document.getElementById('forgot-username').value;
            const code = document.getElementById('forgot-code').value;
            const newPassword = document.getElementById('forgot-new-password').value;
            const confirmPassword = document.getElementById('forgot-confirm-password').value;
            
            // 验证手机号格式
            const phoneRegex = /^1[3-9]\d{9}$/;
            if (!phoneRegex.test(phone)) {
                showError('请输入有效的手机号');
                return;
            }
            
            // 验证验证码
            if (!code || code.length !== 6) {
                showError('请输入6位验证码');
                return;
            }
            
            // 验证密码
            if (!newPassword || newPassword.length < 6) {
                showError('密码长度至少为6位');
                return;
            }
            
            if (newPassword !== confirmPassword) {
                showError('两次输入的密码不一致');
                return;
            }
            
            try {
                // 调用后端API重置密码
                const response = await fetch('/jg/api/reset-password.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        phone: phone,
                        code: code,
                        newPassword: newPassword
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showMessage('密码重置成功，请登录', 'success');
                    
                    // 3秒后跳转到登录表单
                    setTimeout(() => {
                        // 隐藏所有表单
                        const forms = document.querySelectorAll('.auth-form');
                        forms.forEach(form => {
                            form.classList.remove('active');
                        });
                        
                        // 显示登录表单
                        document.getElementById('login-form').classList.add('active');
                    }, 3000);
                } else {
                    showError(data.error || '密码重置失败，请重试');
                }
            } catch (error) {
                console.error('密码重置失败:', error);
                showError('网络错误，请检查网络连接后重试');
            }
        });
        
        // 预加载关键脚本
        const scriptsToPreload = [
            '/jg/js-core/event-bus.js',
            '/jg/js-core/storage.js',
            '/jg/js-core/intelligent-storage.js',
            '/jg/js-core/logger.js',
            '/jg/js-core/utils.js',
            '/jg/js-core/export-templates.js',
            '/jg/js-core/constants.js',
            '/jg/js-shared/theme.js',
            '/jg/js-components/form-dialog.js',
            '/jg/js-components/festival-effect.js',
            '/jg/js-pages/home.js'
        ];
        
        scriptsToPreload.forEach(preloadScript);

    </script>
</body>
</html>