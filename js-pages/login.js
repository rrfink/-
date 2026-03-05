// 内存缓存，减少localStorage访问频率
const memoryCache = {
    user_email: null,
    user_password: null,
    user_id: null,
    users_data: null,
    
    // 获取缓存值
    get(key) {
        return this[key];
    },
    
    // 设置缓存值
    set(key, value) {
        this[key] = value;
        // 同时更新localStorage
        try {
            if (typeof value === 'object') {
                localStorage.setItem(key, JSON.stringify(value));
            } else {
                localStorage.setItem(key, value);
            }
        } catch (error) {
            console.warn('localStorage更新失败:', error);
        }
    },
    
    // 从localStorage加载数据到缓存
    loadFromLocalStorage() {
        const keys = ['user_email', 'user_password', 'user_id', 'users_data'];
        keys.forEach(key => {
            try {
                const value = localStorage.getItem(key);
                if (value !== null) {
                    if (key === 'users_data') {
                        try {
                            this[key] = JSON.parse(value);
                        } catch (e) {
                            console.warn(`解析${key}失败，使用原始值`);
                            this[key] = value;
                        }
                    } else {
                        this[key] = value;
                    }
                }
            } catch (error) {
                console.warn(`加载${key}失败:`, error);
            }
        });
    }
};

// 初始化时加载数据到缓存
memoryCache.loadFromLocalStorage();

/**
 * 显示消息提示
 * @param {string} text - 消息文本
 * @param {string} type - 消息类型 (success, error, info)
 */
function showMessage(text, type) {
    const messageEl = document.getElementById('message');
    messageEl.innerHTML = text;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}

/**
 * 显示或隐藏加载状态
 * @param {boolean} show - 是否显示加载状态
 */
function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
    document.getElementById('loginForm').style.display = show ? 'none' : 'block';
}

/**
 * 打开使用说明对话框
 */
function openTutorial() {
    document.getElementById('tutorialDialog').classList.add('show');
    document.body.style.overflow = 'hidden';
}

/**
 * 关闭使用说明对话框
 */
function closeTutorial() {
    document.getElementById('tutorialDialog').classList.remove('show');
    document.body.style.overflow = '';
}

/**
 * 复制 SQL 代码到剪贴板
 */
function copySQLCode() {
    const sqlCodeElement = document.getElementById('sqlCode');
    const sqlCode = sqlCodeElement ? sqlCodeElement.innerText : '';
    const copyBtn = document.getElementById('copySQLCodeBtn');
    
    if (!sqlCode) {
        showMessage('没有找到SQL代码', 'error');
        return;
    }
    
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(sqlCode).then(() => {
                copyBtn.innerHTML = '<i class="fas fa-check"></i> 已复制';
                copyBtn.style.background = '#52c41a';
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="fas fa-copy"></i> 复制';
                    copyBtn.style.background = 'var(--primary-color)';
                }, 2000);
            }).catch(err => {
                console.error('复制失败:', err);
                fallbackCopy(sqlCode);
            });
        } else {
            fallbackCopy(sqlCode);
        }
    } catch (error) {
        console.error('复制出错:', error);
        fallbackCopy(sqlCode);
    }
}

/**
 * 复制文本到剪贴板的降级方案
 * @param {string} text - 要复制的文本
 */
function fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        const copyBtn = document.getElementById('copySQLCodeBtn');
        if (successful) {
            copyBtn.innerHTML = '<i class="fas fa-check"></i> 已复制';
            copyBtn.style.background = '#52c41a';
            setTimeout(() => {
                copyBtn.innerHTML = '<i class="fas fa-copy"></i> 复制';
                copyBtn.style.background = 'var(--primary-color)';
            }, 2000);
        } else {
            showMessage('❌ 复制失败，请手动复制', 'error');
        }
    } catch (err) {
        console.error('复制失败:', err);
        showMessage('❌ 复制失败，请手动复制', 'error');
    }
    
    document.body.removeChild(textArea);
}

// 注册本地用户
async function registerLocalUser(email, password) {
    try {
        const response = await fetch('/jg/api/register.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 注册成功，自动登录
            showMessage('本地账号创建成功，正在登录...', 'success');
            setTimeout(() => {
                handleBackendLogin(email, password);
            }, 1000);
        } else {
            // 注册失败
            showMessage('注册失败：' + data.error, 'error');
        }
    } catch (error) {
        console.error('注册失败:', error);
        showMessage('注册失败，请稍后重试', 'error');
    }
}

// 处理基于后端 SQLite 数据库的登录
async function handleBackendLogin(email, password) {
    console.log('执行基于后端 SQLite 数据库的登录');
    showLoading(true);
    
    try {
        // 验证邮箱和密码格式
        const emailRegex = /^[^@]+@[^@]+\.[^@]+$/;
        if (!emailRegex.test(email)) {
            showMessage('请输入有效的邮箱地址', 'error');
            showLoading(false);
            return;
        }
        
        if (password.length < 6) {
            showMessage('密码长度至少为6位', 'error');
            showLoading(false);
            return;
        }
        
        // 发送登录请求到后端
        const response = await fetch('/jg/api/login.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        // 检查响应状态
        if (!response.ok) {
            throw new Error('服务器响应失败: ' + response.status);
        }
        
        // 解析响应数据
        const data = await response.json();
        
        if (data.success) {
            // 登录成功
            // 保存登录状态到本地存储
            if (document.getElementById('rememberPassword').checked) {
                localStorage.setItem('user_email', email);
                localStorage.setItem('user_password', password);
            }
            
            // 保存用户ID到本地存储
            localStorage.setItem('user_id', data.user.id);
            
            // 显示登录成功消息
            const successMessage = `
                <div style="text-align: left; line-height: 1.8;">
                    <strong>🎉 登录成功！</strong><br><br>
                    <strong>登录方式：</strong><br>
                    基于后端 SQLite 数据库登录<br><br>
                    <strong>用户信息：</strong><br>
                    邮箱：${data.user.email}<br>
                    用户ID：${data.user.id}<br>
                    登录时间：${new Date().toLocaleString()}<br>
                    ${data.message ? `<br><strong>提示：</strong>${data.message}` : ''}
                </div>
            `;
            showMessage(successMessage, 'success');
            
            // 登录成功后跳转到主页
            setTimeout(() => {
                window.location.href = '/jg/index.php';
            }, 3000);
        } else {
            // 登录失败，检查是否是因为用户不存在
            if (data.error === '用户不存在') {
                // 尝试注册本地账号
                showMessage('账号不存在，正在创建本地账号...', 'info');
                setTimeout(() => {
                    registerLocalUser(email, password);
                }, 1000);
            } else {
                // 其他错误
                showMessage('登录失败：' + data.error, 'error');
            }
        }
    } catch (error) {
        console.error('后端登录失败:', error);
        console.error('错误堆栈:', error.stack);
        showMessage('登录失败，请稍后重试', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * 处理登录
 */
async function handleLogin() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        showMessage('请填写邮箱和密码', 'error');
        return;
    }

    showLoading(true);

    try {
        // 直接使用基于后端 SQLite 的登录
        console.log('使用后端 SQLite 数据库登录');
        await handleBackendLogin(email, password);
    } catch (error) {
        console.error('登录失败:', error);
        showMessage('登录失败，请稍后重试', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * 处理注册
 */
async function handleRegister() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        showMessage('请填写邮箱和密码', 'error');
        return;
    }

    if (password.length < 6) {
        showMessage('密码长度至少6位', 'error');
        return;
    }

    showLoading(true);

    try {
        // 直接使用本地注册
        console.log('使用本地注册');
        await registerLocalUser(email, password);
    } catch (error) {
        console.error('注册失败:', error);
        showMessage('注册失败，请稍后重试', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
    // 使用事件委托和一次性添加，避免重复添加事件监听器
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;
    
    // 存储已添加的事件监听器，避免重复添加
    const addedListeners = new Set();
    
    // 添加事件监听器的辅助函数
    function addListener(elementId, event, handler) {
        const element = document.getElementById(elementId);
        if (element && !addedListeners.has(`${elementId}:${event}`)) {
            element.addEventListener(event, handler);
            addedListeners.add(`${elementId}:${event}`);
        }
    }
    
    // 1. 登录/注册相关
    const loginBtn = document.getElementById('handleLoginBtn') || document.getElementById('loginBtn');
    if (loginBtn && !addedListeners.has('loginBtn:click')) {
        loginBtn.addEventListener('click', handleLogin);
        addedListeners.add('loginBtn:click');
    }
    
    const registerBtn = document.getElementById('handleRegisterBtn') || document.getElementById('registerBtn');
    if (registerBtn && !addedListeners.has('registerBtn:click')) {
        registerBtn.addEventListener('click', handleRegister);
        addedListeners.add('registerBtn:click');
    }
    
    // 2. 教程相关
    addListener('openTutorialBtn', 'click', openTutorial);
    addListener('closeTutorialBtn', 'click', closeTutorial);
    addListener('closeTutorialBtn1', 'click', closeTutorial);
    addListener('closeTutorialBtn2', 'click', closeTutorial);
    addListener('copySQLCodeBtn', 'click', copySQLCode);
    
    // 3. 密码显示/隐藏
    addListener('togglePassword', 'click', function() {
        const passwordInput = document.getElementById('password');
        const icon = this.querySelector('i');
        if (passwordInput) {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon?.classList.remove('fa-eye-slash');
                icon?.classList.add('fa-eye');
            } else {
                passwordInput.type = 'password';
                icon?.classList.remove('fa-eye');
                icon?.classList.add('fa-eye-slash');
            }
        }
    });
    
    // 4. 按 Enter 键提交表单
    addListener('email', 'keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('password')?.focus();
        }
    });
    
    addListener('password', 'keypress', function(e) {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });
}

/**
 * 检查登录状态
 */
function checkLoginStatus() {
    const user_id = localStorage.getItem('user_id');
    const loginForm = document.getElementById('loginForm');
    
    if (user_id && loginForm) {
        // 如果已经登录，显示已登录状态
        loginForm.innerHTML = `
            <div class="logged-in-status">
                <div class="status-icon">
                    <i class="fas fa-user-circle"></i>
                </div>
                <h3>您已登录</h3>
                <p>账号信息已保存，点击进入主页开始使用</p>
                <div class="login-actions">
                    <button id="goHomeBtn" class="btn btn-primary">
                        <i class="fas fa-home"></i>
                        进入主页
                    </button>
                    <button id="logoutBtn" class="btn btn-secondary">
                        <i class="fas fa-sign-out-alt"></i>
                        退出登录
                    </button>
                </div>
            </div>
        `;

        // 添加事件监听器
        document.getElementById('goHomeBtn').addEventListener('click', function() {
            window.location.href = '/jg/index.php';
        });

        document.getElementById('logoutBtn').addEventListener('click', function() {
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
            
            window.location.reload();
        });
    }
}

/**
 * 填充账号密码
 */
function fillCredentials() {
    try {
        // 填充账号密码
        const savedEmail = memoryCache.get('user_email');
        const savedPassword = memoryCache.get('user_password');
        
        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.value = savedEmail || ''; // 只填充保存的邮箱
        }
        
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.value = savedPassword || ''; // 只填充保存的密码
        }
        
        const rememberCheckbox = document.getElementById('rememberPassword');
        if (rememberCheckbox && savedPassword) {
            rememberCheckbox.checked = true;
        }
    } catch (error) {
        console.error('填充账号密码失败:', error);
    }
}

/**
 * 初始化登录页面
 */
function initLoginPage() {
    // 快速初始化，减少不必要的函数调用
    try {
        // 立即执行核心初始化函数
        fillCredentials();
        setupEventListeners();
        checkLoginStatus();
    } catch (error) {
        console.error('初始化登录页面失败:', error);
    }
}

// 添加全局引用
window.initLoginPage = initLoginPage;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.showMessage = showMessage;
window.showLoading = showLoading;

// 自动初始化
initLoginPage();