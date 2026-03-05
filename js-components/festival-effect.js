if (!window.FestivalEffect) {
    window.FestivalEffect = class FestivalEffect {
    constructor() {
        this.defaultHolidays = {
            '2025-01-01': '元旦',
            '2025-02-08': '春节',
            '2025-02-09': '春节',
            '2025-02-10': '春节',
            '2025-02-11': '春节',
            '2025-04-04': '清明节',
            '2025-05-01': '劳动节',
            '2025-06-08': '端午节',
            '2025-09-24': '中秋节',
            '2025-10-01': '国庆节',
            '2025-10-02': '国庆节',
            '2025-10-03': '国庆节',
            
            '2026-01-01': '元旦',
            '2026-02-17': '春节',
            '2026-02-18': '春节',
            '2026-02-19': '春节',
            '2026-02-20': '春节',
            '2026-02-21': '春节',
            '2026-02-22': '春节',
            '2026-02-23': '春节',
            '2026-04-05': '清明节',
            '2026-05-01': '劳动节',
            '2026-05-02': '劳动节',
            '2026-06-20': '端午节',
            '2026-09-26': '中秋节',
            '2026-10-01': '国庆节',
            '2026-10-02': '国庆节',
            '2026-10-03': '国庆节'
        };
        
        this.container = null;
        this.canvas = null;
        this.animationId = null;
        this.fireworks = [];
        this.particles = [];
        this.sparks = [];
    }

    init() {
        if (this.isTodayFestival()) {
            this.showFestivalEffect();
        }
    }

    isTodayFestival() {
        const today = new Date();
        const todayStr = this.formatDate(today);
        
        if (this.defaultHolidays[todayStr]) {
            return { date: todayStr, name: this.defaultHolidays[todayStr] };
        }
        
        return null;
    }

    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    showFestivalEffect() {
        const festival = this.isTodayFestival();
        if (!festival) return;

        this.container = document.createElement('div');
        this.container.id = 'festivalEffectContainer';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 9999;
            pointer-events: none;
        `;

        this.canvas = document.createElement('canvas');
        this.canvas.id = 'fireworksCanvas';
        this.canvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
        `;
        this.container.appendChild(this.canvas);

        const blessing = document.createElement('div');
        blessing.id = 'festivalBlessing';
        blessing.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 3rem;
            font-weight: bold;
            font-family: 'Microsoft YaHei', 'PingFang SC', 'SimHei', sans-serif;
            color: #fff;
            text-shadow: 0 0 10px rgba(255, 255, 255, 0.9), 0 0 20px rgba(255, 165, 0, 0.7), 0 0 30px rgba(255, 105, 180, 0.5), 0 0 40px rgba(0, 0, 0, 0.8);
            opacity: 0;
            animation: fadeInOut 5s ease-in-out;
            z-index: 10000;
            padding: 5px 15px;
            display: flex;
            flex-direction: row-reverse;
            gap: 20px;
            align-items: center;
        `;
        const text = `${festival.name}快乐`;
        text.split('').reverse().forEach(char => {
            const span = document.createElement('span');
            span.textContent = char;
            span.style.display = 'block';
            blessing.appendChild(span);
        });
        this.container.appendChild(blessing);

        const skipButton = document.createElement('button');
        skipButton.id = 'skipFestivalEffect';
        skipButton.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            border: none;
            border-radius: 20px;
            padding: 12px 20px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            z-index: 10001;
            transition: all 0.3s ease;
            pointer-events: auto;
        `;
        skipButton.textContent = '跳过特效';
        skipButton.onclick = () => {
            this.stopEffect();
        };
        this.container.appendChild(skipButton);

        document.body.appendChild(this.container);
        this.addCSSAnimation();
        
        this.container.addEventListener('click', () => {
            this.playFireworkSound();
        }, { once: true });
        
        this.initFireworks();

        setTimeout(() => {
            if (this.container) {
                this.container.style.transition = 'opacity 1s ease';
                this.container.style.opacity = '0';
                setTimeout(() => this.stopEffect(), 1000);
            }
        }, 5000);
    }

    addCSSAnimation() {
        if (!document.getElementById('festivalEffectStyles')) {
            const style = document.createElement('style');
            style.id = 'festivalEffectStyles';
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                    20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    initFireworks() {
        const ctx = this.canvas.getContext('2d');
        const width = this.canvas.width = window.innerWidth;
        const height = this.canvas.height = window.innerHeight;

        const fireworkColors = [
            ['#ff0000', '#ff6600', '#ffcc00'],
            ['#00ff00', '#66ff66', '#ccffcc'],
            ['#0000ff', '#6666ff', '#ccccff'],
            ['#ff00ff', '#ff66ff', '#ffccff'],
            ['#ffff00', '#ffff66', '#ffffff'],
            ['#ff6600', '#ff9933', '#ffcc66']
        ];

        const gravity = 0.1;

        for (let i = 0; i < 10; i++) {
            this.createFirework(width, height, fireworkColors);
        }

        const animate = () => {
            if (!document.body.contains(this.canvas)) {
                if (this.animationId) {
                    cancelAnimationFrame(this.animationId);
                    this.animationId = null;
                }
                return;
            }

            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(0, 0, width, height);

            for (let i = this.fireworks.length - 1; i >= 0; i--) {
                const firework = this.fireworks[i];
                
                firework.trail.push({x: firework.x, y: firework.y, alpha: 0.8});
                if (firework.trail.length > 20) {
                    firework.trail.shift();
                }

                for (let j = 0; j < firework.trail.length; j++) {
                    const trail = firework.trail[j];
                    ctx.beginPath();
                    ctx.arc(trail.x, trail.y, 1, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255,255,255, ${trail.alpha})`;
                    ctx.fill();
                    trail.alpha -= 0.04;
                }

                const dx = firework.targetX - firework.x;
                const dy = firework.targetY - firework.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 30 || firework.speed < 1) {
                    this.explodeFirework(firework);
                    this.fireworks.splice(i, 1);
                } else {
                    const angle = Math.atan2(dy, dx);
                    const vx = Math.cos(angle) * firework.speed;
                    const vy = Math.sin(angle) * firework.speed + gravity;

                    firework.x += vx;
                    firework.y += vy;
                    firework.speed *= 0.99;

                    ctx.beginPath();
                    ctx.arc(firework.x, firework.y, firework.size, 0, Math.PI * 2);
                    ctx.fillStyle = firework.color;
                    ctx.fill();

                    ctx.beginPath();
                    ctx.arc(firework.x, firework.y, firework.size * 2, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(${parseInt(firework.color.slice(1, 3), 16)}, ${parseInt(firework.color.slice(3, 5), 16)}, ${parseInt(firework.color.slice(5, 7), 16)}, 0.3)`;
                    ctx.fill();
                }
            }

            for (let i = this.particles.length - 1; i >= 0; i--) {
                const particle = this.particles[i];
                
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vy += gravity;
                particle.alpha -= 0.015;
                particle.life++;

                if (particle.alpha <= 0 || particle.life >= particle.maxLife) {
                    this.particles.splice(i, 1);
                    continue;
                }

                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${particle.r}, ${particle.g}, ${particle.b}, ${particle.alpha})`;
                ctx.fill();

                if (Math.random() < 0.05) {
                    this.createSpark(particle.x, particle.y, particle.r, particle.g, particle.b);
                }
            }

            for (let i = this.sparks.length - 1; i >= 0; i--) {
                const spark = this.sparks[i];
                
                spark.x += spark.vx;
                spark.y += spark.vy;
                spark.alpha -= 0.05;
                spark.life++;

                if (spark.alpha <= 0 || spark.life >= spark.maxLife) {
                    this.sparks.splice(i, 1);
                    continue;
                }

                ctx.beginPath();
                ctx.arc(spark.x, spark.y, 1, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${spark.r}, ${spark.g}, ${spark.b}, ${spark.alpha})`;
                ctx.fill();
            }

            if (Math.random() < 0.08) {
                this.createFirework(width, height, fireworkColors);
            }

            this.animationId = requestAnimationFrame(animate);
        };

        animate();
    }

    createFirework(width, height, fireworkColors) {
        const colorSet = fireworkColors[Math.floor(Math.random() * fireworkColors.length)];
        this.fireworks.push({
            x: Math.random() * width,
            y: height,
            targetY: Math.random() * height * 0.4 + height * 0.1,
            targetX: Math.random() * width * 0.8 + width * 0.1,
            speed: 6 + Math.random() * 4,
            acceleration: -0.05,
            alpha: 1,
            color: colorSet[0],
            colorSet: colorSet,
            trail: [],
            size: 3
        });
    }

    explodeFirework(firework) {
        this.playFireworkSound();
        
        const particleCount = 50 + Math.floor(Math.random() * 30);
        const angleStep = Math.PI * 2 / particleCount;

        for (let i = 0; i < particleCount; i++) {
            const angle = i * angleStep + Math.random() * 0.1;
            const speed = 2 + Math.random() * 4;
            const color = firework.colorSet[Math.floor(Math.random() * firework.colorSet.length)];

            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);

            this.particles.push({
                x: firework.x,
                y: firework.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alpha: 1,
                r: r,
                g: g,
                b: b,
                life: 0,
                maxLife: 80 + Math.floor(Math.random() * 40),
                size: 2 + Math.random() * 2
            });
        }
    }

    createSpark(x, y, r, g, b) {
        const sparkCount = 2 + Math.floor(Math.random() * 2);

        for (let i = 0; i < sparkCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2;

            this.sparks.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alpha: 1,
                r: r,
                g: g,
                b: b,
                life: 0,
                maxLife: 20 + Math.floor(Math.random() * 15)
            });
        }
    }

    playFireworkSound() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;

            const audioContext = new AudioContext();
            
            audioContext.resume().then(() => {
                this.createAndPlaySound(audioContext);
            }).catch(() => {
                this.createAndPlaySound(audioContext);
            });
        } catch (e) {
            console.error('Failed to play firework sound:', e);
        }
    }

    createAndPlaySound(audioContext) {
        try {
            console.log('Creating firework sound...');
            
            const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.5, audioContext.sampleRate);
            const noiseData = noiseBuffer.getChannelData(0);
            for (let i = 0; i < noiseData.length; i++) {
                noiseData[i] = Math.random() * 2 - 1;
            }
            const noiseSource = audioContext.createBufferSource();
            noiseSource.buffer = noiseBuffer;

            const lowFreqOscillator = audioContext.createOscillator();

            const filter = audioContext.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2000, audioContext.currentTime);
            filter.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.5);

            const delay = audioContext.createDelay(0.2);
            delay.delayTime.setValueAtTime(0.1, audioContext.currentTime);
            const delayGain = audioContext.createGain();
            delayGain.gain.setValueAtTime(0.3, audioContext.currentTime);

            const gainNode = audioContext.createGain();

            noiseSource.connect(filter);
            lowFreqOscillator.connect(filter);
            filter.connect(delay);
            delay.connect(delayGain);
            delayGain.connect(gainNode);
            filter.connect(gainNode);
            gainNode.connect(audioContext.destination);

            lowFreqOscillator.type = 'sawtooth';
            lowFreqOscillator.frequency.setValueAtTime(50 + Math.random() * 100, audioContext.currentTime);
            lowFreqOscillator.frequency.exponentialRampToValueAtTime(20 + Math.random() * 30, audioContext.currentTime + 1);

            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.05, audioContext.currentTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.002, audioContext.currentTime + 1);

            const duration = 1 + Math.random() * 0.5;
            noiseSource.start(audioContext.currentTime);
            noiseSource.stop(audioContext.currentTime + 0.2);
            lowFreqOscillator.start(audioContext.currentTime);
            lowFreqOscillator.stop(audioContext.currentTime + duration);
            
            console.log('Firework sound started');
        } catch (e) {
            console.error('Failed to create sound:', e);
        }
    }

    stopEffect() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        this.fireworks = [];
        this.particles = [];
        this.sparks = [];
    }
};
}