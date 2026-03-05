/**
 * 图片懒加载模块
 * 延迟加载屏幕外图片，加快首屏速度
 */

class LazyLoad {
    constructor(options = {}) {
        this.options = {
            selector: '[data-lazy]',
            rootMargin: '50px',
            threshold: 0.01,
            placeholder: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E',
            ...options
        };
        
        this.imageCache = new Map();
        this.observer = null;
        this.init();
    }

    init() {
        if (!('IntersectionObserver' in window)) {
            // 浏览器不支持 IntersectionObserver，直接加载所有图片
            this.loadAllImages();
            return;
        }

        this.observer = new IntersectionObserver(
            (entries) => this.handleIntersection(entries),
            {
                rootMargin: this.options.rootMargin,
                threshold: this.options.threshold
            }
        );

        this.observeImages();
    }

    /**
     * 观察所有需要懒加载的图片
     */
    observeImages() {
        const images = document.querySelectorAll(this.options.selector);
        images.forEach(img => {
            // 设置占位图
            if (!img.src || img.src === window.location.href) {
                img.src = this.options.placeholder;
            }
            this.observer.observe(img);
        });
    }

    /**
     * 处理交叉观察回调
     */
    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                this.loadImage(entry.target);
                this.observer.unobserve(entry.target);
            }
        });
    }

    /**
     * 加载单张图片
     */
    loadImage(img) {
        const src = img.dataset.src;
        const srcset = img.dataset.srcset;
        
        if (!src) return;

        // 检查缓存
        if (this.imageCache.has(src)) {
            this.setImageSrc(img, src, srcset);
            return;
        }

        // 预加载图片
        const preloadImg = new Image();
        
        preloadImg.onload = () => {
            this.imageCache.set(src, true);
            this.setImageSrc(img, src, srcset);
            img.classList.add('lazy-loaded');
        };

        preloadImg.onerror = () => {
            img.classList.add('lazy-error');
            // 触发错误事件
            img.dispatchEvent(new CustomEvent('lazyError', { detail: { src } }));
        };

        preloadImg.src = src;
    }

    /**
     * 设置图片源
     */
    setImageSrc(img, src, srcset) {
        img.src = src;
        if (srcset) {
            img.srcset = srcset;
        }
        
        // 移除 data 属性
        img.removeAttribute('data-src');
        img.removeAttribute('data-srcset');
        
        // 触发自定义事件
        img.dispatchEvent(new CustomEvent('lazyLoaded', { detail: { src } }));
    }

    /**
     * 加载所有图片（用于不支持 IntersectionObserver 的浏览器）
     */
    loadAllImages() {
        const images = document.querySelectorAll(this.options.selector);
        images.forEach(img => this.loadImage(img));
    }

    /**
     * 刷新 - 观察新添加的图片
     */
    refresh() {
        if (this.observer) {
            this.observeImages();
        }
    }

    /**
     * 销毁
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.imageCache.clear();
    }
}

// 自动初始化
let lazyLoadInstance = null;

function initLazyLoad(options = {}) {
    if (lazyLoadInstance) {
        lazyLoadInstance.destroy();
    }
    lazyLoadInstance = new LazyLoad(options);
    return lazyLoadInstance;
}

// DOM 加载完成后自动初始化
document.addEventListener('DOMContentLoaded', () => {
    initLazyLoad();
});

// 暴露到全局
window.LazyLoad = LazyLoad;
window.initLazyLoad = initLazyLoad;
window.lazyLoadInstance = lazyLoadInstance;
