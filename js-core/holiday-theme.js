/**
 * 节日主题管理器
 * 自动检测法定节日并切换主题，支持用户自定义偏好
 */
class HolidayThemeManager {
    constructor(storage = null) {
        this.currentTheme = null;
        this.themes = this.defineThemes();
        this.storage = storage;
        this.userPreference = null;
        this.holidays = [];
        this.init();
    }

    /**
     * 定义所有节日主题
     */
    defineThemes() {
        return {
            springFestival: {
                name: '春节',
                id: 'spring-festival',
                colors: {
                    primary: '#DC143C',
                    secondary: '#FFD700',
                    background: '#FFF8DC',
                    accent: '#FF6347'
                },
                decorations: ['lantern', 'firecracker', 'fu'],
                icon: '🧧'
            },
            lanternFestival: {
                name: '元宵节',
                id: 'lantern-festival',
                colors: {
                    primary: '#FF6B6B',
                    secondary: '#FFE66D',
                    background: '#FFF9E6',
                    accent: '#FF8C42'
                },
                decorations: ['lantern', 'tangyuan'],
                icon: '🏮'
            },
            qingming: {
                name: '清明节',
                id: 'qingming',
                colors: {
                    primary: '#2E8B57',
                    secondary: '#90EE90',
                    background: '#F0FFF0',
                    accent: '#3CB371'
                },
                decorations: ['willow', 'spring'],
                icon: '🌿'
            },
            laborDay: {
                name: '劳动节',
                id: 'labor-day',
                colors: {
                    primary: '#4169E1',
                    secondary: '#FFD700',
                    background: '#F0F8FF',
                    accent: '#FF6347'
                },
                decorations: ['tools', 'medal'],
                icon: '👷'
            },
            dragonBoat: {
                name: '端午节',
                id: 'dragon-boat',
                colors: {
                    primary: '#228B22',
                    secondary: '#8B4513',
                    background: '#F5FFFA',
                    accent: '#2E8B57'
                },
                decorations: ['zongzi', 'dragon', 'sachet'],
                icon: '🐲'
            },
            midAutumn: {
                name: '中秋节',
                id: 'mid-autumn',
                colors: {
                    primary: '#4B0082',
                    secondary: '#FFD700',
                    background: '#FFF8DC',
                    accent: '#FF8C00'
                },
                decorations: ['moon', 'mooncake', 'rabbit'],
                icon: '🌕'
            },
            nationalDay: {
                name: '国庆节',
                id: 'national-day',
                colors: {
                    primary: '#DE2910',
                    secondary: '#FFDE00',
                    background: '#FFF5F5',
                    accent: '#FF4500'
                },
                decorations: ['flag', 'firework', 'tiananmen'],
                icon: '🇨🇳'
            },
            newYear: {
                name: '元旦',
                id: 'new-year',
                colors: {
                    primary: '#1E90FF',
                    secondary: '#87CEEB',
                    background: '#F0F8FF',
                    accent: '#FFD700'
                },
                decorations: ['firework', 'countdown', 'champagne'],
                icon: '🎆'
            },
            birthday: {
                name: '生日',
                id: 'birthday',
                colors: {
                    primary: '#FF69B4',
                    secondary: '#FFB6C1',
                    background: '#FFF0F5',
                    accent: '#FF1493'
                },
                decorations: ['cake', 'balloon', 'confetti', 'star'],
                icon: '🎂'
            }
        };
    }

    /**
     * 从 localStorage 或 storage 加载节日数据
     */
    async loadHolidays() {
        try {
            if (this.storage) {
                const holidays = await this.storage.getHolidays();
                if (holidays && holidays.length > 0) {
                    this.holidays = holidays;
    
                    return;
                }
            }
        } catch (error) {
            console.error('[HolidayTheme] 从 storage 加载节日数据失败:', error);
        }
        
        try {
            const localStorageHolidays = localStorage.getItem('holidays');
            if (localStorageHolidays) {
                this.holidays = JSON.parse(localStorageHolidays);

            }
        } catch (error) {
            console.error('[HolidayTheme] 从 localStorage 加载节日数据失败:', error);
        }
    }

    /**
     * 根据节日名称获取对应的主题
     */
    getThemeByHolidayName(holidayName) {
        const nameMap = {
            '元旦': 'newYear',
            '春节': 'springFestival',
            '元宵节': 'lanternFestival',
            '清明': 'qingming',
            '清明节': 'qingming',
            '劳动': 'laborDay',
            '劳动节': 'laborDay',
            '端午': 'dragonBoat',
            '端午节': 'dragonBoat',
            '中秋': 'midAutumn',
            '中秋节': 'midAutumn',
            '国庆': 'nationalDay',
            '国庆节': 'nationalDay',
            '生日': 'birthday'
        };
        
        for (const [key, themeId] of Object.entries(nameMap)) {
            if (holidayName.includes(key)) {
                return this.themes[themeId];
            }
        }
        
        return null;
    }

    /**
     * 从身份证号提取生日（YYYY-MM-DD格式）
     */
    extractBirthdayFromIdNumber(idNumber) {
        if (!idNumber || idNumber.length !== 18) {
            return null;
        }
        
        try {
            const year = idNumber.substring(6, 10);
            const month = idNumber.substring(10, 12);
            const day = idNumber.substring(12, 14);
            return `${year}-${month}-${day}`;
        } catch (error) {
            console.error('[HolidayTheme] 提取生日失败:', error);
            return null;
        }
    }
    
    /**
     * 检查今天是否是用户生日
     */
    isUserBirthday() {
        try {

            
            // 尝试从多个位置获取用户信息
            let personalInfo = null;
            let userInfo = null;
            
            // 1. 先尝试全局 personalInfo
            const globalInfo = localStorage.getItem('personalInfo');
            if (globalInfo) {
                try {
                    userInfo = JSON.parse(globalInfo);

                } catch (e) {
                    console.error('[HolidayTheme] 解析全局 personalInfo 失败:', e);
                }
            }
            
            // 2. 如果没有，尝试从项目 personalInfo 加载
            if (!userInfo?.idNumber) {
                try {
                    const currentProjectId = localStorage.getItem('currentProjectId');
                    if (currentProjectId) {
                        const projectInfo = localStorage.getItem(`personalInfo_${currentProjectId}`);
                        if (projectInfo) {
                            userInfo = JSON.parse(projectInfo);

                        }
                    }
                } catch (e) {
                    console.error('[HolidayTheme] 解析项目 personalInfo 失败:', e);
                }
            }
            
            if (!userInfo) {
                return false;
            }
            
            if (!userInfo?.idNumber || userInfo.idNumber === '未设置') {
                return false;
            }
            
            const birthday = this.extractBirthdayFromIdNumber(userInfo.idNumber);
            if (!birthday) {
                return false;
            }
            
            const now = new Date();
            const today = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const birthdayMonthDay = birthday.substring(5); // MM-DD
            
            return today === birthdayMonthDay;
        } catch (error) {
            console.error('[HolidayTheme] 检查用户生日失败:', error);
            return false;
        }
    }
    
    /**
     * 获取当前日期的节日
     */
    getCurrentHoliday() {
        const now = new Date();
        const today = Utils.formatDate(now, 'YYYY-MM-DD');
        
        // 首先检查今天是否是用户生日
        if (this.isUserBirthday()) {
            return this.themes['birthday'];
        }
        
        if (this.holidays && this.holidays.length > 0) {
            const todayHoliday = this.holidays.find(h => h.date === today);
            if (todayHoliday) {
                // 首先检查节日分类
                if (todayHoliday.category === 'birthday') {
                    return this.themes['birthday'];
                }
                
                // 然后检查节日名称
                const theme = this.getThemeByHolidayName(todayHoliday.name);
                if (theme) {
                    return theme;
                }
            }
        }
        
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();

        const holidays = [
            { theme: 'newYear', month: 1, day: 1, duration: 1 },
            { theme: 'springFestival', month: 1, day: 29, duration: 7 },
            { theme: 'lanternFestival', month: 2, day: 12, duration: 1 },
            { theme: 'qingming', month: 4, day: 5, duration: 3 },
            { theme: 'laborDay', month: 5, day: 1, duration: 5 },
            { theme: 'dragonBoat', month: 6, day: 19, duration: 3 },
            { theme: 'midAutumn', month: 9, day: 25, duration: 3 },
            { theme: 'nationalDay', month: 10, day: 1, duration: 7 }
        ];

        for (const holiday of holidays) {
            const startDate = new Date(year, holiday.month - 1, holiday.day);
            const endDate = new Date(year, holiday.month - 1, holiday.day + holiday.duration - 1);
            
            if (now >= startDate && now <= endDate) {
                return this.themes[holiday.theme];
            }
        }

        return null;
    }

    /**
     * 应用主题
     */
    applyTheme(theme) {
        if (!theme) {
            this.removeTheme();
            return;
        }

        this.currentTheme = theme;
        
        // 设置CSS变量
        const root = document.documentElement;
        root.style.setProperty('--holiday-primary', theme.colors.primary);
        root.style.setProperty('--holiday-secondary', theme.colors.secondary);
        root.style.setProperty('--holiday-background', theme.colors.background);
        root.style.setProperty('--holiday-accent', theme.colors.accent);
        
        // 检查是否是深色模式
        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
        
        // 同时设置主题颜色变量，让整个页面组件都应用主题颜色
        root.style.setProperty('--primary-color', theme.colors.primary);
        root.style.setProperty('--secondary-color', theme.colors.secondary);
        // 深色模式下不覆盖背景色
        if (!isDarkMode) {
            root.style.setProperty('--bg-color', theme.colors.background);
        }

        // 添加主题类
        document.body.classList.add(`theme-${theme.id}`);
        document.body.classList.add('holiday-theme-active');

        // 添加装饰元素
        this.addDecorations(theme);

        // 显示主题提示
        this.showThemeNotification(theme);


    }

    /**
     * 移除主题
     */
    removeTheme() {
        if (this.currentTheme) {
            document.body.classList.remove(`theme-${this.currentTheme.id}`);
        }
        document.body.classList.remove('holiday-theme-active');
        
        // 移除CSS变量
        const root = document.documentElement;
        root.style.removeProperty('--holiday-primary');
        root.style.removeProperty('--holiday-secondary');
        root.style.removeProperty('--holiday-background');
        root.style.removeProperty('--holiday-accent');
        
        // 移除主题颜色变量
        root.style.removeProperty('--primary-color');
        root.style.removeProperty('--secondary-color');
        root.style.removeProperty('--bg-color');

        // 移除装饰
        this.removeDecorations();

        this.currentTheme = null;
    }

    /**
     * 添加装饰元素
     */
    addDecorations(theme) {
        this.removeDecorations();

        const container = document.createElement('div');
        container.id = 'holiday-decorations';
        container.className = 'holiday-decorations';

        // 检查是否是深色模式
        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
        
        // 深色模式下添加动态背景（直接添加到body，不放在container里）
        if (isDarkMode) {
            this.addDarkModeBackground(theme);
        }

        // 添加主题图标浮动
        const iconFloat = document.createElement('div');
        iconFloat.className = 'holiday-icon-float';
        iconFloat.textContent = theme.icon;
        container.appendChild(iconFloat);

        // 添加飘落动画元素
        this.addFallingElements(container, theme);

        // 根据装饰类型添加元素
        theme.decorations.forEach((decoration, index) => {
            const el = document.createElement('div');
            el.className = `holiday-decoration decoration-${decoration}`;
            el.style.animationDelay = `${index * 0.5}s`;
            container.appendChild(el);
        });

        document.body.appendChild(container);
    }
    
    /**
     * 添加深色模式动态背景
     */
    addDarkModeBackground(theme) {
        // 先移除已存在的背景
        const existingBg = document.getElementById('holiday-dark-bg');
        if (existingBg) {
            existingBg.remove();
        }
        
        const darkBg = document.createElement('div');
        darkBg.className = 'holiday-dark-bg';
        darkBg.id = 'holiday-dark-bg';
        
        // 根据主题设置光点颜色
        const particleColors = {
            'spring-festival': 'rgba(220, 20, 60, 0.3)',
            'birthday': 'rgba(255, 105, 180, 0.3)',
            'national-day': 'rgba(222, 41, 16, 0.3)',
            'new-year': 'rgba(30, 144, 255, 0.3)',
            'mid-autumn': 'rgba(255, 215, 0, 0.3)',
            'lantern-festival': 'rgba(255, 107, 107, 0.3)',
            'qingming': 'rgba(46, 139, 87, 0.3)',
            'labor-day': 'rgba(65, 105, 225, 0.3)',
            'dragon-boat': 'rgba(34, 139, 34, 0.3)'
        };
        
        const particleColor = particleColors[theme.id] || 'rgba(96, 165, 250, 0.2)';
        
        // 创建光点
        const particleCount = 50;
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'holiday-dark-particle';
            
            const size = Math.random() * 20 + 5;
            const startX = Math.random() * 100;
            const startY = Math.random() * 100;
            const endX = (Math.random() - 0.5) * 200;
            const endY = (Math.random() - 0.5) * 200;
            const duration = Math.random() * 20 + 10;
            const scaleEnd = Math.random() * 0.5 + 0.5;
            
            particle.style.cssText = `
                width: ${size}px;
                height: ${size}px;
                left: ${startX}%;
                top: ${startY}%;
                background: ${particleColor};
                --x-end: ${endX}px;
                --y-end: ${endY}px;
                --scale-end: ${scaleEnd};
                animation-duration: ${duration}s;
                animation-delay: ${Math.random() * 10}s;
            `;
            
            darkBg.appendChild(particle);
        }
        
        // 直接添加到body
        document.body.insertBefore(darkBg, document.body.firstChild);
    }

    /**
     * 添加飘落元素
     */
    addFallingElements(container, theme) {
        // 定义每个主题的飘落元素
        const fallingItems = {
            springFestival: ['🧧', '🏮', '✨', '🎊'],
            lanternFestival: ['🏮', '✨', '🌟', '💫'],
            qingming: ['🌿', '🍃', '🌸', '🌱'],
            laborDay: ['⭐', '🏆', '🎖️', '💪'],
            dragonBoat: ['🐲', '🚣', '🌿', '✨'],
            midAutumn: ['🌕', '🥮', '🐇', '✨'],
            nationalDay: ['🇨🇳', '⭐', '🎆', '✨'],
            newYear: ['🎆', '✨', '🎊', '🎉'],
            birthday: ['🎂', '🎈', '🎉', '🎁', '✨', '🌟', '🥳', '🎊']
        };

        const items = fallingItems[theme.id] || ['✨'];
        
        // 创建20-30个飘落元素
        const count = 20 + Math.floor(Math.random() * 10);
        
        for (let i = 0; i < count; i++) {
            const item = document.createElement('div');
            item.className = 'falling-item';
            item.textContent = items[Math.floor(Math.random() * items.length)];
            
            // 随机位置、大小、速度和延迟
            const left = Math.random() * 100;
            const size = 16 + Math.random() * 20;
            const duration = 8 + Math.random() * 6;
            const delay = Math.random() * 10;
            const opacity = 0.3 + Math.random() * 0.5;
            
            item.style.cssText = `
                position: fixed;
                left: ${left}%;
                top: -50px;
                font-size: ${size}px;
                opacity: ${opacity};
                pointer-events: none;
                z-index: 9998;
                animation: falling ${duration}s linear ${delay}s infinite;
            `;
            
            container.appendChild(item);
        }

        // 添加飘落动画CSS
        if (!document.getElementById('falling-animation')) {
            const style = document.createElement('style');
            style.id = 'falling-animation';
            style.textContent = `
                @keyframes falling {
                    0% {
                        transform: translateY(-50px) rotate(0deg);
                        opacity: 0;
                    }
                    10% {
                        opacity: var(--opacity, 0.6);
                    }
                    90% {
                        opacity: var(--opacity, 0.6);
                    }
                    100% {
                        transform: translateY(100vh) rotate(360deg);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * 移除装饰元素
     */
    removeDecorations() {
        const existing = document.getElementById('holiday-decorations');
        if (existing) {
            existing.remove();
        }
        // 同时移除深色背景
        const darkBg = document.getElementById('holiday-dark-bg');
        if (darkBg) {
            darkBg.remove();
        }
    }

    /**
     * 显示主题通知和横幅
     */
    showThemeNotification(theme) {
        // 检查是否已经显示过
        const notifiedKey = `holiday-theme-notified-${theme.id}-${new Date().getFullYear()}`;
        if (localStorage.getItem(notifiedKey)) {
            return;
        }

        // 创建通知
        const notification = document.createElement('div');
        notification.className = 'holiday-theme-notification';
        notification.innerHTML = `
            <div class="holiday-notification-content">
                <span class="holiday-icon">${theme.icon}</span>
                <span class="holiday-message">${theme.name}快乐！已为您切换节日主题</span>
                <button class="holiday-close-btn">×</button>
            </div>
        `;

        document.body.appendChild(notification);

        // 动画显示
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // 关闭按钮
        notification.querySelector('.holiday-close-btn').addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        });

        // 自动关闭
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.remove('show');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }
        }, 5000);

        // 标记已通知
        localStorage.setItem(notifiedKey, 'true');

        // 显示祝福语横幅
        this.showGreetingBanner(theme);
    }

    /**
     * 显示节日祝福语横幅
     */
    showGreetingBanner(theme) {
        // 节日祝福语
        let greetings = {
            springFestival: ['新春快乐，万事如意！', '恭喜发财，红包拿来！', '龙年大吉，阖家幸福！'],
            lanternFestival: ['元宵快乐，团团圆圆！', '花灯璀璨，幸福美满！'],
            qingming: ['清明安康，缅怀先人', '踏青赏春，平安健康'],
            laborDay: ['劳动节快乐！', '致敬劳动者，您辛苦了！'],
            dragonBoat: ['端午安康！', '粽香四溢，幸福安康！'],
            midAutumn: ['中秋快乐，月圆人团圆！', '花好月圆，幸福美满！'],
            nationalDay: ['国庆快乐！', '祝福祖国繁荣昌盛！'],
            newYear: ['新年快乐！', '元旦快乐，万事如意！'],
            birthday: ['生日快乐！', '祝你生日快乐！', '愿你每一天都开心！', '生日快乐，心想事成！']
        };
        
        // 如果是生日主题，尝试获取用户名字，添加个性化祝福
        let userName = '';
        if (theme.id === 'birthday') {
            try {
                const personalInfo = localStorage.getItem('personalInfo');
                if (personalInfo) {
                    const userInfo = JSON.parse(personalInfo);
                    if (userInfo?.name) {
                        userName = userInfo.name;
                        greetings = {
                            birthday: [
                                `${userName}，生日快乐！`,
                                `祝${userName}生日快乐！`,
                                `${userName}，愿你每一天都开心！`,
                                `${userName}，生日快乐，心想事成！`
                            ]
                        };
                    }
                }
            } catch (error) {
                console.error('[HolidayTheme] 获取用户信息失败:', error);
            }
        }
        
        const messages = greetings[theme.id] || [`${theme.name}快乐！`];
        const message = messages[Math.floor(Math.random() * messages.length)];

        const banner = document.createElement('div');
        banner.id = 'holiday-greeting-banner';
        banner.className = 'holiday-greeting-banner';
        banner.innerHTML = `
            <div class="banner-content">
                <span class="banner-icon">${theme.icon}</span>
                <span class="banner-text">${message}</span>
                <span class="banner-icon">${theme.icon}</span>
            </div>
        `;

        document.body.appendChild(banner);

        // 动画显示
        setTimeout(() => {
            banner.classList.add('show');
        }, 100);

        // 10秒后自动隐藏
        setTimeout(() => {
            banner.classList.remove('show');
            setTimeout(() => {
                banner.remove();
            }, 500);
        }, 10000);

        // 燃放烟花
        this.launchFireworks();
    }

    /**
     * 燃放烟花效果
     */
    launchFireworks() {
        const container = document.createElement('div');
        container.className = 'holiday-fireworks';
        document.body.appendChild(container);

        // 燃放8轮烟花，持续6秒
        for (let round = 0; round < 8; round++) {
            setTimeout(() => {
                this.createFirework(container);
                // 播放烟花音效
                this.playFireworkSound();
            }, round * 750);
        }

        // 8秒后移除容器
        setTimeout(() => {
            container.remove();
        }, 8000);
    }

    /**
     * 播放烟花音效
     */
    playFireworkSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // 创建多个音效层
            const now = audioContext.currentTime;
            
            // 爆炸声 - 低频
            const explosion = audioContext.createOscillator();
            const explosionGain = audioContext.createGain();
            explosion.type = 'sawtooth';
            explosion.frequency.setValueAtTime(150, now);
            explosion.frequency.exponentialRampToValueAtTime(50, now + 0.3);
            explosionGain.gain.setValueAtTime(1.0, now);
            explosionGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            explosion.connect(explosionGain);
            explosionGain.connect(audioContext.destination);
            explosion.start(now);
            explosion.stop(now + 0.3);

            // 嘶嘶声 - 高频噪声
            const bufferSize = audioContext.sampleRate * 0.5;
            const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
            const noise = audioContext.createBufferSource();
            noise.buffer = noiseBuffer;
            const noiseGain = audioContext.createGain();
            const noiseFilter = audioContext.createBiquadFilter();
            noiseFilter.type = 'highpass';
            noiseFilter.frequency.value = 1000;
            noiseGain.gain.setValueAtTime(0.8, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(audioContext.destination);
            noise.start(now);
            noise.stop(now + 0.5);

            // 火花声 - 快速高频
            const spark = audioContext.createOscillator();
            const sparkGain = audioContext.createGain();
            spark.type = 'sine';
            spark.frequency.setValueAtTime(800, now);
            spark.frequency.exponentialRampToValueAtTime(2000, now + 0.1);
            spark.frequency.exponentialRampToValueAtTime(100, now + 0.3);
            sparkGain.gain.setValueAtTime(0.9, now);
            sparkGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            spark.connect(sparkGain);
            sparkGain.connect(audioContext.destination);
            spark.start(now);
            spark.stop(now + 0.3);

        } catch (error) {
            // 音效播放失败不影响主功能
        }
    }

    /**
     * 创建单个烟花
     */
    createFirework(container) {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];
        const x = 20 + Math.random() * 60; // 20% - 80% 屏幕宽度
        const y = 20 + Math.random() * 40; // 20% - 60% 屏幕高度
        const color = colors[Math.floor(Math.random() * colors.length)];

        // 创建爆炸粒子
        const particleCount = 20 + Math.floor(Math.random() * 15);
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'firework';
            particle.style.left = x + '%';
            particle.style.top = y + '%';
            particle.style.backgroundColor = color;
            particle.style.boxShadow = `0 0 6px ${color}`;

            // 随机方向
            const angle = (Math.PI * 2 * i) / particleCount;
            const velocity = 50 + Math.random() * 100;
            const tx = Math.cos(angle) * velocity;
            const ty = Math.sin(angle) * velocity;

            particle.style.setProperty('--x', `${tx}px`);
            particle.style.setProperty('--y', `${ty}px`);
            particle.style.animation = `firework-explode 1s ease-out forwards`;

            container.appendChild(particle);

            // 动画结束后移除
            setTimeout(() => {
                particle.remove();
            }, 1000);
        }
    }

    /**
     * 手动切换主题（用于测试）
     */
    manualSwitch(themeId) {
        const theme = this.themes[themeId];
        if (theme) {
            this.applyTheme(theme);
            // 手动切换时也显示烟花效果
            this.launchFireworks();
        } else {
            this.removeTheme();
        }
    }

    /**
     * 加载用户偏好设置
     */
    async loadUserPreference() {
        try {
            if (this.storage) {
                const preference = await this.storage.get('userSettings', 'holidayThemePreference');
                if (preference) {
                    this.userPreference = preference.value;
                }
            }
            // 如果没有存储的设置，从 localStorage 读取或默认为 'auto'
            if (!this.userPreference) {
                this.userPreference = localStorage.getItem('holidayThemePreference') || 'auto';
            }
        } catch (error) {
            this.userPreference = localStorage.getItem('holidayThemePreference') || 'auto';
        }
    }

    /**
     * 保存用户偏好设置
     */
    async saveUserPreference(preference) {
        this.userPreference = preference;
        try {
            if (this.storage) {
                await this.storage.set('userSettings', {
                    id: 'holidayThemePreference',
                    key: 'holidayThemePreference',
                    value: preference,
                    user_id: localStorage.getItem('user_id'),
                    updatedAt: new Date().toISOString()
                });
            }
            // 同时保存到 localStorage
            localStorage.setItem('holidayThemePreference', preference);
        } catch (error) {
            // 降级到 localStorage
            localStorage.setItem('holidayThemePreference', preference);
        }
    }

    /**
     * 获取可用的主题列表（用于个人中心设置）
     */
    getAvailableThemes() {
        const themes = [];
        for (const [key, theme] of Object.entries(this.themes)) {
            themes.push({
                id: key,
                name: theme.name,
                icon: theme.icon
            });
        }
        return themes;
    }

    /**
     * 根据用户偏好应用主题
     */
    async applyThemeByPreference() {
        await this.loadUserPreference();

        // 如果用户选择不使用主题
        if (this.userPreference === 'none') {
            this.removeTheme();
            return;
        }

        // 如果用户选择了特定主题
        if (this.userPreference && this.userPreference !== 'auto') {
            const theme = this.themes[this.userPreference];
            if (theme) {
                this.applyTheme(theme);
                return;
            }
        }

        // 自动模式：根据日期检测
        const holiday = this.getCurrentHoliday();
        if (holiday) {
            this.applyTheme(holiday);
        } else {
            this.removeTheme();
        }
    }

    /**
     * 初始化
     */
    async init() {
        await this.loadHolidays();
        await this.applyThemeByPreference();

        setInterval(async () => {
            if (this.userPreference === 'auto') {
                await this.loadHolidays();
                const currentHoliday = this.getCurrentHoliday();
                if (currentHoliday?.id !== this.currentTheme?.id) {
                    this.applyTheme(currentHoliday);
                }
            }
        }, 24 * 60 * 60 * 1000);
        
        // 监听主题切换事件，重新应用节日主题
        window.addEventListener('themeChanged', () => {
            if (this.currentTheme) {
                this.applyTheme(this.currentTheme);
            }
        });
        
        // 兼容 EventBus
        if (window.eventBus) {
            window.eventBus.on('theme:changed', () => {
                if (this.currentTheme) {
                    this.applyTheme(this.currentTheme);
                }
            });
        }

    }
}

// 导出
window.HolidayThemeManager = HolidayThemeManager;
